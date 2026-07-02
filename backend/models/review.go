package models

import "time"

type Review struct {
	ID           string    `json:"id"`
	LabID        string    `json:"lab_id"`
	UserID       *string   `json:"user_id"`
	Rating       int       `json:"rating"`
	ReviewerName string    `json:"reviewer_name"`
	Comment      string    `json:"comment"`
	CreatedAt    time.Time `json:"created_at"`
}
