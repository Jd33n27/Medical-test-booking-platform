package models

import "time"

type Booking struct {
	ID                string     `json:"id"`
	TestID            string     `json:"test_id"`
	TimeSlotID        string     `json:"time_slot_id"`
	PatientName       string     `json:"patient_name"`
	PatientEmail      string     `json:"patient_email"`
	PatientPhone      string     `json:"patient_phone"`
	HomeCollection    bool       `json:"home_collection"`
	CollectionAddress *string    `json:"collection_address,omitempty"`
	PaymentStatus     string     `json:"payment_status"` // pending, paid, failed
	FlutterwaveRef    *string    `json:"flutterwave_ref,omitempty"`
	TotalPriceNaira   float64    `json:"total_price_naira"`
	ResultReady       bool       `json:"result_ready"`
	ResultFileURL     *string    `json:"result_file_url,omitempty"`
	UserID            *string    `json:"user_id,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// BookingRequest defines input fields for creating a booking
type BookingRequest struct {
	TestID            string  `json:"test_id"`
	TimeSlotID        string  `json:"time_slot_id"`
	PatientName       string  `json:"patient_name"`
	PatientEmail      string  `json:"patient_email"`
	PatientPhone      string  `json:"patient_phone"`
	HomeCollection    bool    `json:"home_collection"`
	CollectionAddress *string `json:"collection_address"`
	UserID            *string `json:"user_id,omitempty"`
	PromoCode         *string `json:"promo_code,omitempty"`
}

// BookingResponse defines output format after a booking request is made
type BookingResponse struct {
	BookingID       string  `json:"booking_id"`
	FlutterwaveLink string  `json:"flutterwave_link"`
	Amount          float64 `json:"amount"`
	Status          string  `json:"status"`
}

// BookingStatusResponse is the status returned to the client
type BookingStatusResponse struct {
	BookingID       string `json:"booking_id"`
	Status          string `json:"status"`
	AppointmentDate string `json:"appointment_date"` // YYYY-MM-DD
	AppointmentTime string `json:"appointment_time"` // HH:MM
	TestName        string `json:"test_name"`
	LabName         string `json:"lab_name"`
	LabAddress      string `json:"lab_address"`
	ResultReady     bool   `json:"result_ready"`
}
