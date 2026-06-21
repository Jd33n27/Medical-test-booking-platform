package models

import "time"

type Test struct {
	ID              string    `json:"id"`
	LabID           string    `json:"lab_id"`
	TestName        string    `json:"test_name"`
	Description     string    `json:"description"`
	PriceNaira      float64   `json:"price_naira"`
	TurnaroundHours int       `json:"turnaround_hours"`
	SampleType      string    `json:"sample_type"`
	CreatedAt       time.Time `json:"created_at"`

	// Joined field from labs table for response representation
	LabName string `json:"lab_name,omitempty"`
}
