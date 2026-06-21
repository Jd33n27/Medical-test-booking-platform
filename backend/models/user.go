package models

import "time"

type User struct {
	ID                   string     `json:"id"`
	Name                 string     `json:"name"`
	Email                string     `json:"email"`
	PasswordHash         string     `json:"-"` // Never output password hash in JSON responses
	Role                 string     `json:"role"` // patient, lab_admin, platform_admin
	LabID                *string    `json:"lab_id,omitempty"`
	VerificationStatus   string     `json:"verification_status"`
	LicenseNumber        *string    `json:"license_number,omitempty"`
	IDNumber             *string    `json:"id_number,omitempty"`
	VerificationDocument *string    `json:"verification_document,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	// Linked Laboratory profile details (automatically fetched if role is lab_admin and lab_id is set)
	LabName                 *string  `json:"lab_name,omitempty"`
	LabAddress              *string  `json:"lab_address,omitempty"`
	LabCity                 *string  `json:"lab_city,omitempty"`
	LabState                *string  `json:"lab_state,omitempty"`
	LabPhone                *string  `json:"lab_phone,omitempty"`
	LabLatitude             *float64 `json:"lab_latitude,omitempty"`
	LabLongitude            *float64 `json:"lab_longitude,omitempty"`
	LabAcceptsHomeCollection *bool    `json:"lab_accepts_home_collection,omitempty"`
}

type RegisterRequest struct {
	Name     string  `json:"name"`
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Role     string  `json:"role"`   // patient, lab_admin
	LabID    *string `json:"lab_id"` // Optional, for lab_admin link
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
