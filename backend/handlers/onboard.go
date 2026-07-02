package handlers

import (
	"fmt"
	"log"
	"os"
	"strings"
	"testbooking-api/db"
	"testbooking-api/middleware"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// OnboardLab registers a new lab, seeds default tests, and seeds time slots
func OnboardLab(c fiber.Ctx) error {
	type OnboardRequest struct {
		Name                  string   `json:"name"`
		Address               string   `json:"address"`
		City                  string   `json:"city"`
		State                 string   `json:"state"`
		Phone                 string   `json:"phone"`
		Latitude              *float64 `json:"latitude"`
		Longitude             *float64 `json:"longitude"`
		AcceptsHomeCollection bool     `json:"accepts_home_collection"`
		CommissionRate        *float64 `json:"commission_rate"`
	}

	var req OnboardRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body parameters",
		})
	}

	// Validation
	if req.Name == "" || req.City == "" || req.State == "" || req.Phone == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Lab name, city, state, and phone number are required",
		})
	}

	var latVal, lngVal float64
	if req.Latitude != nil {
		latVal = *req.Latitude
	}
	if req.Longitude != nil {
		lngVal = *req.Longitude
	}

	commRate := 20.00
	if req.CommissionRate != nil && *req.CommissionRate >= 0 && *req.CommissionRate <= 100 {
		commRate = *req.CommissionRate
	}

	// 1. Insert Laboratory record
	labID := uuid.New().String()
	insertQuery := `
		INSERT INTO labs (id, name, address, city, state, phone, latitude, longitude, accepts_home_collection, commission_rate)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := db.DB.Exec(insertQuery, labID, req.Name, req.Address, req.City, req.State, req.Phone, latVal, lngVal, req.AcceptsHomeCollection, commRate)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   fmt.Sprintf("Failed to onboard lab profile: %v", err),
		})
	}

	// 2. Auto-seed default tests for this new lab
	defaultTests := []struct {
		TestName        string
		Description     string
		PriceNaira      float64
		TurnaroundHours int
		SampleType      string
	}{
		{"Full Blood Count", "Counts all blood cell types, including red cells, white cells, and platelets. Essential for screening infections or anemia.", 5500.00, 24, "Blood"},
		{"Lipid Profile", "Measures cholesterol levels (HDL, LDL) and triglycerides in your blood to evaluate heart disease risk.", 8000.00, 24, "Blood"},
		{"Typhoid Test", "Detects antibodies against Salmonella typhi to diagnose Typhoid fever.", 4500.00, 2, "Blood"},
	}

	for _, t := range defaultTests {
		testID := uuid.New().String()
		query := `
			INSERT INTO tests (id, lab_id, test_name, description, price_naira, turnaround_hours, sample_type)
			VALUES (?, ?, ?, ?, ?, ?, ?)`
		_, err := db.DB.Exec(query, testID, labID, t.TestName, t.Description, t.PriceNaira, t.TurnaroundHours, t.SampleType)
		if err != nil {
			log.Printf("Warning: Failed to seed test %s for onboarded lab %s: %v", t.TestName, labID, err)
		}
	}

	// 3. Auto-seed time slots for next 7 days, slots from 8 AM to 4 PM (excluding 12 PM), capacity 10
	times := []string{
		"08:00:00",
		"09:00:00",
		"10:00:00",
		"11:00:00",
		"13:00:00",
		"14:00:00",
		"15:00:00",
		"16:00:00",
	}
	now := time.Now()
	for i := 0; i < 7; i++ {
		dateStr := now.AddDate(0, 0, i).Format("2006-01-02")
		for _, slotTime := range times {
			slotID := uuid.New().String()
			query := `
				INSERT INTO time_slots (id, lab_id, slot_date, slot_time, capacity, booked)
				VALUES (?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE id=id`
			_, err := db.DB.Exec(query, slotID, labID, dateStr, slotTime, 10, 0)
			if err != nil {
				log.Printf("Warning: Failed to seed slot on %s %s for onboarded lab %s: %v", dateStr, slotTime, labID, err)
			}
		}
	}

	// Try to extract optional user ID from authorization header
	var userID string
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenString := parts[1]
			secret := os.Getenv("JWT_SECRET")
			if secret == "" {
				secret = "medbook_secret_key_development_only_12345"
			}
			jwtSecretKey := []byte(secret)
			
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method")
				}
				return jwtSecretKey, nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if idVal, ok := claims["user_id"].(string); ok {
						userID = idVal
					}
				}
			}
		}
	}

	response := fiber.Map{
		"lab_id":          labID,
		"name":            req.Name,
		"commission_rate": commRate,
	}

	if userID != "" {
		// Update user's labID and role to lab_admin
		updateQuery := `UPDATE users SET lab_id = ?, role = 'lab_admin' WHERE id = ?`
		_, err = db.DB.Exec(updateQuery, labID, userID)
		if err != nil {
			log.Printf("Warning: Failed to update user lab link: %v", err)
		} else {
			// Generate new token containing the updated lab_id and role
			newToken, err := middleware.GenerateToken(userID, "lab_admin", &labID)
			if err == nil {
				response["token"] = newToken
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    response,
	})
}

// GetLabsList returns a simple helper representing all registered labs
func GetLabsList(c fiber.Ctx) error {
	rows, err := db.DB.Query("SELECT id, name FROM labs ORDER BY name ASC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve labs lookup directory",
		})
	}
	defer rows.Close()

	type LabLookup struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}

	lookups := []LabLookup{}
	for rows.Next() {
		var l LabLookup
		if err := rows.Scan(&l.ID, &l.Name); err == nil {
			lookups = append(lookups, l)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    lookups,
	})
}
