package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"testbooking-api/db"
	"testbooking-api/models"
	"time"

	"github.com/gofiber/fiber/v3"
)

// GetLabs returns all labs from the database
func GetLabs(c fiber.Ctx) error {
	rows, err := db.DB.Query(`
		SELECT id, name, address, city, state, phone, latitude, longitude, accepts_home_collection, created_at 
		FROM labs 
		ORDER BY name ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Failed to fetch labs from database",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	defer rows.Close()

	labs := []models.Lab{}
	for rows.Next() {
		var l models.Lab
		err := rows.Scan(
			&l.ID,
			&l.Name,
			&l.Address,
			&l.City,
			&l.State,
			&l.Phone,
			&l.Latitude,
			&l.Longitude,
			&l.AcceptsHomeCollection,
			&l.CreatedAt,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Error parsing labs data",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}
		labs = append(labs, l)
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      labs,
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// GeocodeAddress proxies requests to Nominatim API for address suggestions
func GeocodeAddress(c fiber.Ctx) error {
	q := c.Query("q")
	if q == "" {
		return c.JSON(fiber.Map{
			"success": true,
			"data":    []interface{}{},
		})
	}

	escapedQ := url.QueryEscape(q)
	apiURL := "https://nominatim.openstreetmap.org/search?format=json&q=" + escapedQ + "&addressdetails=1&countrycodes=ng&limit=5"

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create request: " + err.Error(),
		})
	}

	// Nominatim policy requires a valid User-Agent
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch address suggestions: " + err.Error(),
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"success": false,
			"error":   "External API returned status: " + resp.Status,
		})
	}

	var result []interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to parse address suggestions: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    result,
	})
}
