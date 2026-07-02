package handlers

import (
	"database/sql"
	"fmt"
	"testbooking-api/db"
	"testbooking-api/models"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// GetLabReviews returns all reviews for a specific laboratory
func GetLabReviews(c fiber.Ctx) error {
	labID := c.Params("lab_id")
	if labID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Lab ID is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	rows, err := db.DB.Query(`
		SELECT id, lab_id, user_id, rating, reviewer_name, comment, created_at
		FROM reviews
		WHERE lab_id = ?
		ORDER BY created_at DESC
	`, labID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     fmt.Sprintf("Failed to fetch reviews: %v", err),
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	defer rows.Close()

	reviews := []models.Review{}
	for rows.Next() {
		var r models.Review
		var userIDNull sql.NullString
		err := rows.Scan(
			&r.ID,
			&r.LabID,
			&userIDNull,
			&r.Rating,
			&r.ReviewerName,
			&r.Comment,
			&r.CreatedAt,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success":   false,
				"data":      nil,
				"error":     "Error parsing reviews data",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		}
		if userIDNull.Valid {
			r.UserID = &userIDNull.String
		}
		reviews = append(reviews, r)
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      reviews,
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// SubmitLabReview submits a new review for a laboratory
func SubmitLabReview(c fiber.Ctx) error {
	labID := c.Params("lab_id")
	if labID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Lab ID is required",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Try to get user_id from context (authentication is required)
	userIDVal := c.Locals("user_id")
	var userID *string
	if userIDVal != nil {
		idStr := userIDVal.(string)
		userID = &idStr
	}

	type ReviewInput struct {
		Rating       int    `json:"rating"`
		ReviewerName string `json:"reviewer_name"`
		Comment      string `json:"comment"`
	}

	var input ReviewInput
	if err := c.Bind().Body(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Invalid request body",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	if input.Rating < 1 || input.Rating > 5 {
		return c.Status(400).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     "Rating must be between 1 and 5",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	// Fallback reviewer name if not provided
	reviewerName := input.ReviewerName
	if reviewerName == "" && userID != nil {
		// Fetch user's registered name
		err := db.DB.QueryRow("SELECT name FROM users WHERE id = ?", *userID).Scan(&reviewerName)
		if err != nil {
			reviewerName = "Patient"
		}
	}
	if reviewerName == "" {
		reviewerName = "Anonymous Patient"
	}

	reviewID := uuid.New().String()
	createdAt := time.Now()

	_, err := db.DB.Exec(`
		INSERT INTO reviews (id, lab_id, user_id, rating, reviewer_name, comment, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, reviewID, labID, userID, input.Rating, reviewerName, input.Comment, createdAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success":   false,
			"data":      nil,
			"error":     fmt.Sprintf("Failed to submit review: %v", err),
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}

	review := models.Review{
		ID:           reviewID,
		LabID:        labID,
		UserID:       userID,
		Rating:       input.Rating,
		ReviewerName: reviewerName,
		Comment:      input.Comment,
		CreatedAt:    createdAt,
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      review,
		"error":     nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
