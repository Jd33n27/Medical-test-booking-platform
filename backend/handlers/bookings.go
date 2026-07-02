package handlers

import (
	"database/sql"
	"fmt"
	"regexp"
	"testbooking-api/db"
	"testbooking-api/models"
	"testbooking-api/services"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

var emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)

// CreateBooking creates a new pending booking, books the slot, and returns the Flutterwave link
func CreateBooking(c fiber.Ctx) error {
	var req models.BookingRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Invalid request body",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// 1. Validation
	if req.TestID == "" || req.TimeSlotID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "test_id and time_slot_id are required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	if req.PatientName == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "patient_name is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	if !emailRegex.MatchString(req.PatientEmail) {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "A valid patient_email is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	if req.PatientPhone == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "patient_phone is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	if req.HomeCollection && (req.CollectionAddress == nil || *req.CollectionAddress == "") {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "collection_address is required when home collection is selected",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Begin Transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Failed to start transaction",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	defer tx.Rollback()

	// 2. Fetch test details (price)
	var price float64
	var testLabID string
	err = tx.QueryRow("SELECT price_naira, lab_id FROM tests WHERE id = ?", req.TestID).Scan(&price, &testLabID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Test not found",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Database error checking test details",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// 3. Verify and update time slot (check capacity)
	var slotLabID string
	var capacity, booked int
	err = tx.QueryRow("SELECT lab_id, capacity, booked FROM time_slots WHERE id = ? FOR UPDATE", req.TimeSlotID).Scan(&slotLabID, &capacity, &booked)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Time slot not found",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Database error checking slot details",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Verify that the test's lab matches the slot's lab
	if testLabID != slotLabID {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Time slot does not belong to the lab offering this test",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Check capacity
	if booked >= capacity {
		return c.Status(409).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Selected time slot is fully booked",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Phase 3: Validate and apply promo code discount
	totalPrice := price
	var promoCodeApplied *string = nil

	if req.PromoCode != nil && *req.PromoCode != "" {
		var discountPercent, discountAmount float64
		var isActive bool
		var expiresAt time.Time

		err = tx.QueryRow(`
			SELECT discount_percent, discount_amount, is_active, expires_at 
			FROM promo_codes 
			WHERE code = ?`, *req.PromoCode).Scan(&discountPercent, &discountAmount, &isActive, &expiresAt)

		if err != nil {
			if err == sql.ErrNoRows {
				return c.Status(400).JSON(fiber.Map{
					"success":   false,
					"data":      nil,
					"error":     "The promo code provided is invalid",
					"timestamp": time.Now().Format(time.RFC3339),
				})
			}
			return c.Status(500).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Database error checking promo code",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}

		now := time.Now()
		expiresEnd := time.Date(expiresAt.Year(), expiresAt.Month(), expiresAt.Day(), 23, 59, 59, 999999999, expiresAt.Location())
		if !isActive || now.After(expiresEnd) {
			return c.Status(400).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "The promo code provided has expired or is inactive",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}

		var discount float64
		if discountPercent > 0 {
			discount = price * (discountPercent / 100.0)
		} else if discountAmount > 0 {
			discount = discountAmount
		}
		if discount > totalPrice {
			discount = totalPrice
		}
		totalPrice = price - discount
		promoCodeApplied = req.PromoCode
	}

	// 4. Create the booking entry in DB
	bookingID := uuid.New().String()
	insertQuery := `
		INSERT INTO bookings (id, test_id, time_slot_id, patient_name, patient_email, patient_phone, home_collection, collection_address, payment_status, total_price_naira, user_id, promo_code)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
	_, err = tx.Exec(insertQuery, bookingID, req.TestID, req.TimeSlotID, req.PatientName, req.PatientEmail, req.PatientPhone, req.HomeCollection, req.CollectionAddress, totalPrice, req.UserID, promoCodeApplied)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     fmt.Sprintf("Failed to create booking: %v", err),
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// 5. Decrement capacity (booked++)
	_, err = tx.Exec("UPDATE time_slots SET booked = booked + 1 WHERE id = ?", req.TimeSlotID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Failed to reserve time slot",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// 6. Generate Flutterwave payment link
	requestBaseURL := c.Protocol() + "://" + c.Hostname()
	flwLink, err := services.InitiatePayment(totalPrice, bookingID, req.PatientEmail, req.PatientName, req.PatientPhone, requestBaseURL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     fmt.Sprintf("Failed to initiate payment session: %v", err),
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Update the booking with the flutterwave reference/tx_ref (which is the booking ID)
	_, err = tx.Exec("UPDATE bookings SET flutterwave_ref = ? WHERE id = ?", bookingID, bookingID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Failed to save payment reference",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Commit Transaction
	err = tx.Commit()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Failed to commit transaction",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.BookingResponse{
			BookingID:       bookingID,
			FlutterwaveLink: flwLink,
			Amount:          totalPrice,
			Status:          "awaiting_payment",
		},
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// GetBookingStatus returns the status details for a given booking ID
func GetBookingStatus(c fiber.Ctx) error {
	bookingID := c.Params("booking_id")
	if bookingID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Booking ID is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	var status string
	var slotDate time.Time
	var slotTimeStr string
	var testName, labName, labAddress string
	var resultReady bool

	query := `
		SELECT b.payment_status, ts.slot_date, ts.slot_time, t.test_name, l.name, l.address, b.result_ready
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		JOIN time_slots ts ON b.time_slot_id = ts.id
		JOIN labs l ON t.lab_id = l.id
		WHERE b.id = ?`

	err := db.DB.QueryRow(query, bookingID).Scan(&status, &slotDate, &slotTimeStr, &testName, &labName, &labAddress, &resultReady)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Booking not found",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Database error looking up booking",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Format time using helper
	formattedTime := formatTimeLabel(slotTimeStr)
	formattedDate := slotDate.Format("2006-01-02")

	response := models.BookingStatusResponse{
		BookingID:       bookingID,
		Status:          status,
		AppointmentDate: formattedDate,
		AppointmentTime: formattedTime,
		TestName:        testName,
		LabName:         labName,
		LabAddress:      labAddress,
		ResultReady:     resultReady,
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      response,
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// GetPatientBookings returns the booking history for the logged-in user
func GetPatientBookings(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	query := `
		SELECT b.id, b.payment_status, ts.slot_date, ts.slot_time, t.test_name, l.name, l.address, b.result_ready, b.result_file_url, b.total_price_naira, b.created_at, l.id AS lab_id, b.home_collection, b.collection_address, b.test_id
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		JOIN time_slots ts ON b.time_slot_id = ts.id
		JOIN labs l ON t.lab_id = l.id
		WHERE b.user_id = ?
		ORDER BY b.created_at DESC`

	rows, err := db.DB.Query(query, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   fmt.Sprintf("Failed to fetch history: %v", err),
		})
	}
	defer rows.Close()

	type HistoryItem struct {
		ID                string    `json:"booking_id"`
		Status            string    `json:"status"`
		AppointmentDate   string    `json:"appointment_date"`
		AppointmentTime   string    `json:"appointment_time"`
		TestName          string    `json:"test_name"`
		LabName           string    `json:"lab_name"`
		LabAddress        string    `json:"lab_address"`
		ResultReady       bool      `json:"result_ready"`
		ResultFileURL     *string   `json:"result_file_url,omitempty"`
		TotalPriceNaira   float64   `json:"total_price_naira"`
		CreatedAt         time.Time `json:"created_at"`
		LabID             string    `json:"lab_id"`
		HomeCollection    bool      `json:"home_collection"`
		CollectionAddress *string   `json:"collection_address,omitempty"`
		TestID            string    `json:"test_id"`
	}

	history := []HistoryItem{}
	for rows.Next() {
		var item HistoryItem
		var slotDate time.Time
		var slotTimeStr string
		var resFile sql.NullString
		var colAddr sql.NullString

		err = rows.Scan(
			&item.ID,
			&item.Status,
			&slotDate,
			&slotTimeStr,
			&item.TestName,
			&item.LabName,
			&item.LabAddress,
			&item.ResultReady,
			&resFile,
			&item.TotalPriceNaira,
			&item.CreatedAt,
			&item.LabID,
			&item.HomeCollection,
			&colAddr,
			&item.TestID,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"error":   "Error parsing booking history logs",
			})
		}

		item.AppointmentDate = slotDate.Format("2006-01-02")
		item.AppointmentTime = formatTimeLabel(slotTimeStr)
		if resFile.Valid {
			item.ResultFileURL = &resFile.String
		}
		if colAddr.Valid {
			item.CollectionAddress = &colAddr.String
		}

		history = append(history, item)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    history,
	})
}

// CancelAppointment updates booking status to cancelled and frees up the slot capacity
func CancelAppointment(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	bookingID := c.Params("booking_id")
	if bookingID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Booking ID is required",
		})
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to start transaction",
		})
	}
	defer tx.Rollback()

	// 1. Fetch booking details to get the time slot ID and check if it's already cancelled
	var slotID, paymentStatus string
	err = tx.QueryRow("SELECT time_slot_id, payment_status FROM bookings WHERE id = ? AND user_id = ?", bookingID, userID).Scan(&slotID, &paymentStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "Booking not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking booking details",
		})
	}

	if paymentStatus == "cancelled" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Booking is already cancelled",
		})
	}

	// 2. Update booking status to cancelled
	_, err = tx.Exec("UPDATE bookings SET payment_status = 'cancelled' WHERE id = ?", bookingID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to cancel booking",
		})
	}

	// 3. Decrement booked count on the time slot
	_, err = tx.Exec("UPDATE time_slots SET booked = CASE WHEN booked > 0 THEN booked - 1 ELSE 0 END WHERE id = ?", slotID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to release slot capacity",
		})
	}

	err = tx.Commit()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to commit transaction",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Appointment cancelled successfully",
	})
}

// RescheduleAppointment changes the time slot for an appointment
func RescheduleAppointment(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	bookingID := c.Params("booking_id")
	if bookingID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Booking ID is required",
		})
	}

	type RescheduleRequest struct {
		TimeSlotID string `json:"time_slot_id"`
	}

	var req RescheduleRequest
	if err := c.Bind().Body(&req); err != nil || req.TimeSlotID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body or time_slot_id missing",
		})
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to start transaction",
		})
	}
	defer tx.Rollback()

	// 1. Fetch old booking details (test_id, old slot_id, status)
	var testID, oldSlotID, paymentStatus string
	err = tx.QueryRow("SELECT test_id, time_slot_id, payment_status FROM bookings WHERE id = ? AND user_id = ?", bookingID, userID).Scan(&testID, &oldSlotID, &paymentStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "Booking not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking booking details",
		})
	}

	if paymentStatus == "cancelled" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Cannot reschedule a cancelled appointment",
		})
	}

	if oldSlotID == req.TimeSlotID {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Appointment is already scheduled for this slot",
		})
	}

	// 2. Fetch test details (lab_id)
	var testLabID string
	err = tx.QueryRow("SELECT lab_id FROM tests WHERE id = ?", testID).Scan(&testLabID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking test details",
		})
	}

	// 3. Verify and lock the new slot (check lab_id, capacity)
	var newSlotLabID string
	var capacity, booked int
	err = tx.QueryRow("SELECT lab_id, capacity, booked FROM time_slots WHERE id = ? FOR UPDATE", req.TimeSlotID).Scan(&newSlotLabID, &capacity, &booked)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "New time slot not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking new slot details",
		})
	}

	if testLabID != newSlotLabID {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Time slot does not belong to the lab offering this test",
		})
	}

	if booked >= capacity {
		return c.Status(409).JSON(fiber.Map{
			"success": false,
			"error":   "Selected time slot is fully booked",
		})
	}

	// 4. Update old slot (decrement booked)
	_, err = tx.Exec("UPDATE time_slots SET booked = CASE WHEN booked > 0 THEN booked - 1 ELSE 0 END WHERE id = ?", oldSlotID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to release old slot capacity",
		})
	}

	// 5. Update new slot (increment booked)
	_, err = tx.Exec("UPDATE time_slots SET booked = booked + 1 WHERE id = ?", req.TimeSlotID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to reserve new slot capacity",
		})
	}

	// 6. Update booking with the new time slot
	_, err = tx.Exec("UPDATE bookings SET time_slot_id = ? WHERE id = ?", req.TimeSlotID, bookingID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update booking time slot",
		})
	}

	err = tx.Commit()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to commit transaction",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Appointment rescheduled successfully",
	})
}
