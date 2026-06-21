package models

import "time"

type TimeSlot struct {
	ID        string    `json:"id"`
	LabID     string    `json:"lab_id"`
	SlotDate  time.Time `json:"slot_date"`
	SlotTime  string    `json:"slot_time"` // e.g. "09:00:00"
	Capacity  int       `json:"capacity"`
	Booked    int       `json:"booked"`
	CreatedAt time.Time `json:"created_at"`
}

// TimeSlotResponse is the format returned to the client
type TimeSlotResponse struct {
	ID        string `json:"id"`
	Date      string `json:"date"` // YYYY-MM-DD
	Time      string `json:"time"` // HH:MM
	Available int    `json:"available"`
	Label     string `json:"label"` // e.g. "Saturday 9:00 AM (8 slots left)"
}

// TestSlotsResponse lists the slots for a specific test
type TestSlotsResponse struct {
	TestID string             `json:"test_id"`
	LabID  string             `json:"lab_id"`
	Slots  []TimeSlotResponse `json:"slots"`
}
