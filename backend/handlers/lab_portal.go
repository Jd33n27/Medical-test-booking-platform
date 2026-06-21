package handlers

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testbooking-api/db"
	"testbooking-api/services"
	"time"

	"github.com/gofiber/fiber/v3"
)

// GetLabBookings retrieves all patient bookings scheduled for the authenticated lab admin's laboratory
func GetLabBookings(c fiber.Ctx) error {
	labIDVal := c.Locals("lab_id")
	if labIDVal == nil {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied. Associated lab profile missing.",
		})
	}
	labID := labIDVal.(string)

	query := `
		SELECT b.id, b.user_id, b.patient_name, b.patient_email, b.patient_phone, b.home_collection, b.collection_address, b.payment_status, b.total_price_naira, b.result_ready, b.result_file_url, b.created_at, t.test_name, ts.slot_date, ts.slot_time
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		JOIN time_slots ts ON b.time_slot_id = ts.id
		WHERE t.lab_id = ?
		ORDER BY ts.slot_date DESC, ts.slot_time DESC`

	rows, err := db.DB.Query(query, labID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   fmt.Sprintf("Failed to retrieve lab orders: %v", err),
		})
	}
	defer rows.Close()

	type LabBooking struct {
		ID                string    `json:"booking_id"`
		UserID            *string   `json:"user_id,omitempty"`
		PatientName       string    `json:"patient_name"`
		PatientEmail      string    `json:"patient_email"`
		PatientPhone      string    `json:"patient_phone"`
		HomeCollection    bool      `json:"home_collection"`
		CollectionAddress *string   `json:"collection_address,omitempty"`
		PaymentStatus     string    `json:"payment_status"`
		TotalPriceNaira   float64   `json:"total_price_naira"`
		ResultReady       bool      `json:"result_ready"`
		ResultFileURL     *string   `json:"result_file_url,omitempty"`
		TestName          string    `json:"test_name"`
		AppointmentDate   string    `json:"appointment_date"`
		AppointmentTime   string    `json:"appointment_time"`
		CreatedAt         time.Time `json:"created_at"`
	}

	bookings := []LabBooking{}
	for rows.Next() {
		var b LabBooking
		var slotDate time.Time
		var slotTimeStr string
		var collAddress, resFileURL, patientUserID sql.NullString

		err = rows.Scan(
			&b.ID,
			&patientUserID,
			&b.PatientName,
			&b.PatientEmail,
			&b.PatientPhone,
			&b.HomeCollection,
			&collAddress,
			&b.PaymentStatus,
			&b.TotalPriceNaira,
			&b.ResultReady,
			&resFileURL,
			&b.CreatedAt,
			&b.TestName,
			&slotDate,
			&slotTimeStr,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"error":   "Error parsing database orders logs",
			})
		}

		b.AppointmentDate = slotDate.Format("2006-01-02")
		b.AppointmentTime = formatTimeLabel(slotTimeStr)

		if patientUserID.Valid {
			b.UserID = &patientUserID.String
		}
		if collAddress.Valid {
			b.CollectionAddress = &collAddress.String
		}
		if resFileURL.Valid {
			b.ResultFileURL = &resFileURL.String
		}

		bookings = append(bookings, b)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    bookings,
	})
}

// UploadDiagnosticResult uploads a report PDF for a test, marks results ready, and triggers notification
func UploadDiagnosticResult(c fiber.Ctx) error {
	labIDVal := c.Locals("lab_id")
	if labIDVal == nil {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied. Associated lab profile missing.",
		})
	}
	labID := labIDVal.(string)

	bookingID := c.Params("booking_id")
	if bookingID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Booking ID parameter is required",
		})
	}

	// 1. Verify the booking belongs to this lab admin's lab
	var dbLabID, patientEmail, patientName, patientPhone, testName, labName string
	query := `
		SELECT t.lab_id, b.patient_email, b.patient_name, b.patient_phone, t.test_name, l.name
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		JOIN labs l ON t.lab_id = l.id
		WHERE b.id = ?`

	err := db.DB.QueryRow(query, bookingID).Scan(&dbLabID, &patientEmail, &patientName, &patientPhone, &testName, &labName)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "Booking record was not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking order privileges",
		})
	}

	if dbLabID != labID {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied. You cannot modify orders for another laboratory.",
		})
	}

	// 2. Parse Multipart PDF file upload
	file, err := c.FormFile("result_file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Missing 'result_file' field in multipart form data upload",
		})
	}

	// Restrict to PDF only for security
	if filepath.Ext(file.Filename) != ".pdf" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Only PDF report files (.pdf) are allowed for diagnostics upload",
		})
	}

	// 3. Save file locally
	uploadDir := "uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Server file directory initialization failed",
		})
	}

	filename := fmt.Sprintf("%s_%d.pdf", bookingID, time.Now().Unix())
	filePath := filepath.Join(uploadDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   fmt.Sprintf("Failed to save report file: %v", err),
		})
	}

	// 4. Update database columns
	fileURL := "/uploads/" + filename
	updateQuery := `
		UPDATE bookings 
		SET result_ready = TRUE, result_file_url = ?, updated_at = NOW() 
		WHERE id = ?`
	
	_, err = db.DB.Exec(updateQuery, fileURL, bookingID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update booking status in database",
		})
	}

	// 5. Fire asynchronous notification email and SMS
	downloadURL := c.BaseURL() + fileURL
	go func() {
		err := services.SendResultEmail(patientEmail, patientName, testName, labName, downloadURL)
		if err != nil {
			fmt.Printf("Error sending results notification email for booking %s: %v\n", bookingID, err)
		}
	}()
	go func() {
		smsMsg := fmt.Sprintf("Hi %s, your diagnostic test results for %s from %s are ready. Download PDF report here: %s",
			patientName, testName, labName, downloadURL)
		err := services.SendSMS(patientPhone, smsMsg)
		if err != nil {
			fmt.Printf("Error sending results notification SMS for booking %s: %v\n", bookingID, err)
		}
	}()

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"booking_id":      bookingID,
			"result_file_url": fileURL,
			"result_ready":    true,
		},
	})
}

// UpdateLabTest edits test details inside the catalog
func UpdateLabTest(c fiber.Ctx) error {
	labIDVal := c.Locals("lab_id")
	if labIDVal == nil {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied. Associated lab profile missing.",
		})
	}
	labID := labIDVal.(string)

	testID := c.Params("test_id")
	if testID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Test ID parameter is required",
		})
	}

	type TestUpdateRequest struct {
		PriceNaira      float64 `json:"price_naira"`
		Description     string  `json:"description"`
		TurnaroundHours int     `json:"turnaround_hours"`
	}

	var req TestUpdateRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid update form JSON body",
		})
	}

	if req.PriceNaira <= 0 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Price must be a valid positive Naira figure",
		})
	}
	if req.TurnaroundHours <= 0 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Turnaround hours must be at least 1 hour",
		})
	}

	// Update catalog item, verifying ownership
	updateQuery := `
		UPDATE tests 
		SET price_naira = ?, description = ?, turnaround_hours = ?
		WHERE id = ? AND lab_id = ?`

	result, err := db.DB.Exec(updateQuery, req.PriceNaira, req.Description, req.TurnaroundHours, testID, labID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error executing catalog update",
		})
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Test record was not found or does not belong to this laboratory",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Diagnostic catalog test updated successfully",
	})
}

// RemoveDiagnosticResult removes a previously uploaded diagnostic result PDF
func RemoveDiagnosticResult(c fiber.Ctx) error {
	labIDVal := c.Locals("lab_id")
	if labIDVal == nil {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied. Associated lab profile missing.",
		})
	}
	labID := labIDVal.(string)

	bookingID := c.Params("booking_id")
	if bookingID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Booking ID parameter is required",
		})
	}

	// Verify the booking belongs to this lab admin's lab, and get the current result_file_url
	var dbLabID string
	var resultFileURL sql.NullString
	query := `
		SELECT t.lab_id, b.result_file_url
		FROM bookings b
		JOIN tests t ON b.test_id = t.id
		WHERE b.id = ?`

	err := db.DB.QueryRow(query, bookingID).Scan(&dbLabID, &resultFileURL)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "Booking record was not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking order privileges",
		})
	}

	if dbLabID != labID {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied. You cannot modify orders for another laboratory.",
		})
	}

	// Optional: Delete physical file from disk
	if resultFileURL.Valid && resultFileURL.String != "" {
		// Clean path to prevent path traversal
		cleanPath := filepath.Clean(resultFileURL.String)
		// Check that the path is within the uploads directory (represented as starting with "/uploads/" or "uploads/")
		if strings.HasPrefix(cleanPath, "/uploads/") || strings.HasPrefix(cleanPath, "uploads/") {
			relPath := strings.TrimPrefix(cleanPath, "/")
			if _, err := os.Stat(relPath); err == nil {
				_ = os.Remove(relPath)
			}
		}
	}

	// Update database
	updateQuery := `
		UPDATE bookings 
		SET result_ready = FALSE, result_file_url = NULL, updated_at = NOW() 
		WHERE id = ?`
	
	_, err = db.DB.Exec(updateQuery, bookingID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update booking status in database",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Diagnostic result removed successfully",
	})
}
