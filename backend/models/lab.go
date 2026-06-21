package models

import "time"

type Lab struct {
	ID                    string    `json:"id"`
	Name                  string    `json:"name"`
	Address               string    `json:"address"`
	City                  string    `json:"city"`
	State                 string    `json:"state"`
	Phone                 string    `json:"phone"`
	Latitude              float64   `json:"latitude"`
	Longitude             float64   `json:"longitude"`
	AcceptsHomeCollection bool      `json:"accepts_home_collection"`
	CreatedAt             time.Time `json:"created_at"`
}
