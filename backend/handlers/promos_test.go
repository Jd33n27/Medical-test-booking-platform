package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testbooking-api/db"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
)

func TestMain(m *testing.M) {
	// Load environment variables from the backend folder .env file
	_ = godotenv.Load("../.env")
	
	// Initialize database connection
	db.InitDB()
	
	// Run tests
	code := m.Run()
	os.Exit(code)
}

func TestValidatePromoCode(t *testing.T) {
	app := fiber.New()
	app.Get("/api/promos/validate", ValidatePromo)

	// 1. Test missing code parameter
	req := httptest.NewRequest("GET", "/api/promos/validate", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request for missing code parameter, got %d", resp.StatusCode)
	}

	// 2. Test invalid coupon code
	req = httptest.NewRequest("GET", "/api/promos/validate?code=INVALIDCODE999", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("Expected 404 Not Found for invalid code, got %d", resp.StatusCode)
	}

	// 3. Test valid seeded promo code (e.g. HEALTH20)
	req = httptest.NewRequest("GET", "/api/promos/validate?code=HEALTH20", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200 OK for HEALTH20 coupon, got %d", resp.StatusCode)
	}

	// Parse body to verify discount_percent is 20.0
	type APIResponse struct {
		Success bool `json:"success"`
		Data    struct {
			Code            string  `json:"code"`
			DiscountPercent float64 `json:"discount_percent"`
			DiscountAmount  float64 `json:"discount_amount"`
		} `json:"data"`
	}

	var ar APIResponse
	err = json.NewDecoder(resp.Body).Decode(&ar)
	if err != nil {
		t.Fatalf("Failed to parse response body JSON: %v", err)
	}

	if !ar.Success {
		t.Error("Expected response success flag to be true")
	}

	if ar.Data.Code != "HEALTH20" {
		t.Errorf("Expected returned code to be 'HEALTH20', got '%s'", ar.Data.Code)
	}

	if ar.Data.DiscountPercent != 20.0 {
		t.Errorf("Expected 20.0%% discount, got %f", ar.Data.DiscountPercent)
	}
}
