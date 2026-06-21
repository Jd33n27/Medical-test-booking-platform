package handlers

import (
	"database/sql"
	"strings"
	"testbooking-api/db"
	"time"

	"github.com/gofiber/fiber/v3"
)

// ValidatePromo validates a coupon promo code and returns its discount values
func ValidatePromo(c fiber.Ctx) error {
	code := strings.TrimSpace(c.Query("code"))
	if code == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Promo code parameter is required",
		})
	}

	type PromoCodeDB struct {
		Code            string
		DiscountPercent float64
		DiscountAmount  float64
		IsActive        bool
		ExpiresAt       time.Time
	}

	var pc PromoCodeDB
	query := `
		SELECT code, discount_percent, discount_amount, is_active, expires_at 
		FROM promo_codes 
		WHERE code = ?`

	err := db.DB.QueryRow(query, code).Scan(&pc.Code, &pc.DiscountPercent, &pc.DiscountAmount, &pc.IsActive, &pc.ExpiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "Promo code is invalid",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error validating promo code",
		})
	}

	// Validation checks
	if !pc.IsActive {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Promo code has been deactivated",
		})
	}

	// Check expiration date
	now := time.Now()
	// Set expires_at to end of that date
	expiresEnd := time.Date(pc.ExpiresAt.Year(), pc.ExpiresAt.Month(), pc.ExpiresAt.Day(), 23, 59, 59, 999999999, pc.ExpiresAt.Location())
	if now.After(expiresEnd) {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Promo code has expired",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"code":             pc.Code,
			"discount_percent": pc.DiscountPercent,
			"discount_amount":  pc.DiscountAmount,
		},
	})
}
