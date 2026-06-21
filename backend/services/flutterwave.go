package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type FlutterwavePayload struct {
	TxRef          string            `json:"tx_ref"`
	Amount         string            `json:"amount"`
	Currency       string            `json:"currency"`
	RedirectURL    string            `json:"redirect_url"`
	PaymentOptions string            `json:"payment_options"`
	Customer       FlwCustomer       `json:"customer"`
	Customizations FlwCustomizations `json:"customizations"`
}

type FlwCustomer struct {
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Name        string `json:"name"`
}

type FlwCustomizations struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Logo        string `json:"logo"`
}

type FlutterwaveResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		Link string `json:"link"`
	} `json:"data"`
}

// InitiatePayment generates a Flutterwave checkout link.
// It will attempt to call the real Flutterwave API if FLUTTERWAVE_SECRET_KEY is configured,
// otherwise it falls back to a sandbox/mock checkout redirect for development.
func InitiatePayment(amount float64, bookingID string, email string, name string, phone string) (string, error) {
	bypassPayment := os.Getenv("BYPASS_PAYMENT")
	secretKey := os.Getenv("FLUTTERWAVE_SECRET_KEY")
	if bypassPayment == "true" || secretKey == "" || secretKey == "FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X" {
		backendURL := os.Getenv("BACKEND_URL")
		if backendURL == "" {
			backendURL = "http://localhost:5000"
		}
		return fmt.Sprintf("%s/api/bookings/%s/mock-pay", backendURL, bookingID), nil
	}

	// Flutterwave redirect URL (will point to local or prod frontend)
	redirectURL := os.Getenv("FRONTEND_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173" // Default dev server
	}
	redirectURL = fmt.Sprintf("%s/payment-success?booking_id=%s", redirectURL, bookingID)

	payload := FlutterwavePayload{
		TxRef:          bookingID,
		Amount:         fmt.Sprintf("%.2f", amount),
		Currency:       "NGN",
		RedirectURL:    redirectURL,
		PaymentOptions: "card,ussd,banktransfer",
		Customer: FlwCustomer{
			Email:       email,
			PhoneNumber: phone,
			Name:        name,
		},
		Customizations: FlwCustomizations{
			Title:       "MedBook Booking",
			Description: fmt.Sprintf("Payment for Test Booking (ID: %s)", bookingID),
			Logo:        "https://cdn-icons-png.flaticon.com/512/3063/3063176.png",
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", "https://api.flutterwave.co/v3/payments", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+secretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("flutterwave api connection failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return "", fmt.Errorf("flutterwave responded with status %d: %v", resp.StatusCode, errResp)
	}

	var flwResp FlutterwaveResponse
	err = json.NewDecoder(resp.Body).Decode(&flwResp)
	if err != nil {
		return "", err
	}

	return flwResp.Data.Link, nil
}
