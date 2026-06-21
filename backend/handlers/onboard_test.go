package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

func TestOnboardLab(t *testing.T) {
	app := fiber.New()
	app.Post("/api/labs/onboard", OnboardLab)

	// Configure 5 seconds timeout to allow DB operations to complete locally
	testConfig := fiber.TestConfig{
		Timeout: 5 * time.Second,
	}

	// 1. Test invalid JSON body
	req := httptest.NewRequest("POST", "/api/labs/onboard", strings.NewReader("{invalid json}"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, testConfig)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status 400 for invalid body, got %d", resp.StatusCode)
	}

	// 2. Test missing parameters validation
	req = httptest.NewRequest("POST", "/api/labs/onboard", strings.NewReader(`{"name": ""}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req, testConfig)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status 400 for validation failure, got %d", resp.StatusCode)
	}

	// 3. Test successful onboarding
	onboardBody := `{
		"name": "Integration Test Laboratory Entity",
		"address": "90 Marina Bypass Road",
		"city": "Lagos",
		"state": "Lagos",
		"phone": "+2349011122233",
		"accepts_home_collection": true
	}`
	req = httptest.NewRequest("POST", "/api/labs/onboard", strings.NewReader(onboardBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req, testConfig)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 OK for successful onboarding, got %d", resp.StatusCode)
	}

	type OnboardResponse struct {
		Success bool `json:"success"`
		Data    struct {
			LabID string `json:"lab_id"`
			Name  string `json:"name"`
		} `json:"data"`
	}

	var or OnboardResponse
	err = json.NewDecoder(resp.Body).Decode(&or)
	if err != nil {
		t.Fatalf("Failed to decode onboarding response: %v", err)
	}

	if !or.Success {
		t.Error("Expected onboarding success status to be true")
	}

	if or.Data.LabID == "" {
		t.Error("Expected returned onboarding lab_id to be non-empty")
	}

	if or.Data.Name != "Integration Test Laboratory Entity" {
		t.Errorf("Expected returned lab name to be 'Integration Test Laboratory Entity', got '%s'", or.Data.Name)
	}
}
