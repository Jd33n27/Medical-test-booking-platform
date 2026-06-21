package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"testbooking-api/db"
	"testbooking-api/services"
	"time"

	"github.com/gofiber/fiber/v3"
)

type FlwWebhookPayload struct {
	Event string         `json:"event"`
	Data  FlwWebhookData `json:"data"`
}

type FlwWebhookData struct {
	ID       int    `json:"id"`
	TxRef    string `json:"tx_ref"` // This is the Booking ID in our system
	FlwRef   string `json:"flw_ref"`
	Amount   float64`json:"amount"`
	Status   string `json:"status"` // "successful", "failed"
	Currency string `json:"currency"`
}

// FlutterwaveWebhook receives webhook calls from Flutterwave to update booking payment status
func FlutterwaveWebhook(c fiber.Ctx) error {
	// 1. Verify webhook signature
	signature := c.Get("verif-hash")
	secretHash := os.Getenv("FLUTTERWAVE_SECRET_HASH")

	if secretHash != "" && signature != secretHash {
		log.Printf("Webhook signature mismatch: expected %s, got %s", secretHash, signature)
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"error":   "Unauthorized signature",
		})
	}

	var payload FlwWebhookPayload
	if err := json.Unmarshal(c.Body(), &payload); err != nil {
		log.Printf("Failed to parse webhook JSON body: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	log.Printf("Received Flutterwave webhook event: %s for booking tx_ref: %s, status: %s", payload.Event, payload.Data.TxRef, payload.Data.Status)

	// We only care about charge.completed event
	if payload.Event == "charge.completed" {
		bookingID := payload.Data.TxRef
		status := payload.Data.Status

		if status == "successful" {
			// Update booking status to 'paid'
			err := processSuccessfulPayment(bookingID, payload.Data.FlwRef)
			if err != nil {
				log.Printf("Failed to process successful payment for booking %s: %v", bookingID, err)
				return c.Status(500).JSON(fiber.Map{
					"success": false,
					"error":   "Failed to process payment status update",
				})
			}
		} else {
			// Update booking status to 'failed' and free the time slot
			err := processFailedPayment(bookingID)
			if err != nil {
				log.Printf("Failed to process failed payment for booking %s: %v", bookingID, err)
			}
		}
	}

	return c.Status(200).JSON(fiber.Map{
		"success": true,
		"message": "Webhook processed successfully",
	})
}

func processSuccessfulPayment(bookingID string, flwRef string) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Get current status, total price, and commission rate to prevent duplicate processing
	var currentStatus string
	var totalPrice float64
	var commissionRate float64
	err = tx.QueryRow(`
		SELECT b.payment_status, b.total_price_naira, l.commission_rate
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		JOIN labs l ON t.lab_id = l.id
		WHERE b.id = ? FOR UPDATE`, bookingID).Scan(&currentStatus, &totalPrice, &commissionRate)
	if err != nil {
		return fmt.Errorf("failed to fetch booking details for processing: %v", err)
	}

	if currentStatus == "paid" {
		log.Printf("Booking %s is already processed as paid", bookingID)
		return nil
	}

	// Calculate commission splits
	platformCommission := totalPrice * (commissionRate / 100.0)
	labPayout := totalPrice - platformCommission

	// 2. Update status to paid and populate splits
	_, err = tx.Exec(`
		UPDATE bookings 
		SET payment_status = 'paid', 
		    flutterwave_ref = ?, 
		    platform_commission = ?, 
		    lab_payout = ?, 
		    updated_at = NOW() 
		WHERE id = ?`, flwRef, platformCommission, labPayout, bookingID)
	if err != nil {
		return fmt.Errorf("failed to update booking splits: %v", err)
	}

	// 3. Fetch booking and lab details for email and SMS confirmations
	var patientEmail, patientName, patientPhone, testName, labName, labAddress, slotTimeStr string
	var slotDate time.Time
	var homeCollection bool
	var collectionAddress sql.NullString

	query := `
		SELECT b.patient_email, b.patient_name, b.patient_phone, t.test_name, l.name, l.address, ts.slot_date, ts.slot_time, b.home_collection, b.collection_address
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		JOIN time_slots ts ON b.time_slot_id = ts.id
		JOIN labs l ON t.lab_id = l.id
		WHERE b.id = ?`

	err = tx.QueryRow(query, bookingID).Scan(
		&patientEmail,
		&patientName,
		&patientPhone,
		&testName,
		&labName,
		&labAddress,
		&slotDate,
		&slotTimeStr,
		&homeCollection,
		&collectionAddress,
	)
	if err != nil {
		return fmt.Errorf("failed to fetch booking info: %v", err)
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	// Format time and date
	formattedTime := formatTimeLabel(slotTimeStr)
	formattedDate := slotDate.Format("2006-01-02")

	collAddrStr := ""
	if collectionAddress.Valid {
		collAddrStr = collectionAddress.String
	}

	// Send confirmation email asynchronously
	go func() {
		err := services.SendConfirmationEmail(
			patientEmail,
			patientName,
			testName,
			labName,
			formattedDate,
			formattedTime,
			labAddress,
			homeCollection,
			collAddrStr,
		)
		if err != nil {
			log.Printf("Email confirmation failed for booking %s: %v", bookingID, err)
		}
	}()

	// Send confirmation SMS asynchronously
	go func() {
		smsMsg := fmt.Sprintf("Hi %s, your booking for %s at %s is confirmed for %s at %s. Ref: %s.",
			patientName, testName, labName, formattedDate, formattedTime, bookingID)
		if homeCollection {
			smsMsg += " A mobile medical collection specialist will visit your address."
		}
		err := services.SendSMS(patientPhone, smsMsg)
		if err != nil {
			log.Printf("SMS confirmation failed for booking %s: %v", bookingID, err)
		}
	}()

	return nil
}

func processFailedPayment(bookingID string) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get current status and slot ID
	var currentStatus string
	var slotID string
	err = tx.QueryRow("SELECT payment_status, time_slot_id FROM bookings WHERE id = ? FOR UPDATE", bookingID).Scan(&currentStatus, &slotID)
	if err != nil {
		return err
	}

	if currentStatus == "failed" {
		return nil
	}

	// Update booking payment status to 'failed'
	_, err = tx.Exec("UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = ?", bookingID)
	if err != nil {
		return err
	}

	// Restore time slot capacity (booked--)
	if currentStatus == "pending" {
		_, err = tx.Exec("UPDATE time_slots SET booked = booked - 1 WHERE id = ? AND booked > 0", slotID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// MockPayBooking handles a GET request to mock pay a booking, transitioning it to paid.
// It redirects the user back to the frontend's payment success page.
func MockPayBooking(c fiber.Ctx) error {
	bookingID := c.Params("booking_id")
	if bookingID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Booking ID is required",
		})
	}

	// Process the successful payment (handles database update, splits, notifications)
	err := processSuccessfulPayment(bookingID, "MOCK_FLW_REF_"+bookingID)
	if err != nil {
		log.Printf("Failed to process mock payment for booking %s: %v", bookingID, err)
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to process mock payment: " + err.Error(),
		})
	}

	// Redirect to frontend payment success page
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	redirectURL := fmt.Sprintf("%s/payment-success?booking_id=%s", frontendURL, bookingID)
	return c.Redirect().Status(fiber.StatusTemporaryRedirect).To(redirectURL)
}
