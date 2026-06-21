package handlers

import (
	"database/sql"
	"fmt"
	"strings"
	"testbooking-api/db"
	"testbooking-api/models"
	"time"

	"github.com/gofiber/fiber/v3"
)

// GetTests fetches all tests, optionally filtered by lab_id or search query
func GetTests(c fiber.Ctx) error {
	labID := c.Query("lab_id")
	search := c.Query("search")

	query := `
		SELECT t.id, t.lab_id, t.test_name, t.description, t.price_naira, t.turnaround_hours, t.sample_type, t.created_at, l.name as lab_name
		FROM tests t
		JOIN labs l ON t.lab_id = l.id
		WHERE 1=1
	`
	args := []interface{}{}

	if labID != "" {
		query += " AND t.lab_id = ?"
		args = append(args, labID)
	}

	if search != "" {
		query += " AND t.test_name LIKE ?"
		args = append(args, "%"+search+"%")
	}

	query += " ORDER BY t.test_name ASC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     fmt.Sprintf("Failed to fetch tests from database: %v", err),
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	defer rows.Close()

	tests := []models.Test{}
	for rows.Next() {
		var t models.Test
		err := rows.Scan(
			&t.ID,
			&t.LabID,
			&t.TestName,
			&t.Description,
			&t.PriceNaira,
			&t.TurnaroundHours,
			&t.SampleType,
			&t.CreatedAt,
			&t.LabName,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Error parsing tests data",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}
		tests = append(tests, t)
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      tests,
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// GetTestSlots returns available time slots for a specific test (next 7 days)
func GetTestSlots(c fiber.Ctx) error {
	testID := c.Params("test_id")
	if testID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Test ID is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// 1. Find the test and its associated lab_id
	var labID string
	err := db.DB.QueryRow("SELECT lab_id FROM tests WHERE id = ?", testID).Scan(&labID)
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
			"error":     "Database error looking up test",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// 2. Query time slots for the next 7 days for this lab
	// We want slot_date >= today
	today := time.Now().Format("2006-01-02")
	rows, err := db.DB.Query(`
		SELECT id, slot_date, slot_time, capacity, booked
		FROM time_slots
		WHERE lab_id = ? AND slot_date >= ?
		ORDER BY slot_date ASC, slot_time ASC
	`, labID, today)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     fmt.Sprintf("Failed to fetch slots: %v", err),
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	defer rows.Close()

	slots := []models.TimeSlotResponse{}
	for rows.Next() {
		var id string
		var slotDate time.Time
		var slotTimeStr string
		var capacity, booked int

		err := rows.Scan(&id, &slotDate, &slotTimeStr, &capacity, &booked)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Error parsing slot data",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}

		available := capacity - booked
		if available < 0 {
			available = 0
		}

		// Only show slots that are not fully booked
		if available > 0 {
			formattedTime := formatTimeLabel(slotTimeStr)
			formattedDate := slotDate.Format("2006-01-02")
			dayOfWeek := slotDate.Format("Monday")
			label := fmt.Sprintf("%s %s (%d slots left)", dayOfWeek, formattedTime, available)

			slots = append(slots, models.TimeSlotResponse{
				ID:        id,
				Date:      formattedDate,
				Time:      formattedTime,
				Available: available,
				Label:     label,
			})
		}
	}

	response := models.TestSlotsResponse{
		TestID: testID,
		LabID:  labID,
		Slots:  slots,
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      response,
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// Helper to format slot time (e.g., "09:00:00" -> "9:00 AM", "15:00:00" -> "3:00 PM")
func formatTimeLabel(slotTimeStr string) string {
	// Standard PostgreSQL time formats
	var parsedTime time.Time
	var err error

	// Remove any fractional seconds
	if idx := strings.Index(slotTimeStr, "."); idx != -1 {
		slotTimeStr = slotTimeStr[:idx]
	}

	// Try common formats
	formats := []string{"15:04:05", "15:04"}
	for _, format := range formats {
		parsedTime, err = time.Parse(format, slotTimeStr)
		if err == nil {
			break
		}
	}

	if err != nil {
		// Fallback to returning string as-is
		return slotTimeStr
	}

	return parsedTime.Format("3:04 PM")
}
