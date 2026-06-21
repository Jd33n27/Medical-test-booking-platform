package handlers

import (
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
