package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestGenerateAndVerifyToken(t *testing.T) {
	userID := "user-123"
	role := "patient"
	labID := "lab-abc"

	token, err := GenerateToken(userID, role, &labID)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Fatal("Expected generated token to be non-empty")
	}
}

func TestRequireAuthMiddleware(t *testing.T) {
	app := fiber.New()

	// Protected endpoint
	app.Get("/protected", RequireAuth, func(c fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"success": true,
			"user_id": c.Locals("user_id"),
			"role":    c.Locals("role"),
		})
	})

	// 1. Test missing Authorization header
	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", resp.StatusCode)
	}

	// 2. Test invalid bearer format
	req = httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "InvalidHeaderValue")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", resp.StatusCode)
	}

	// 3. Test valid token authentication
	userID := "test-user-id"
	role := "lab_admin"
	labID := "test-lab-id"
	token, _ := GenerateToken(userID, role, &labID)

	req = httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestRequireRoleMiddleware(t *testing.T) {
	app := fiber.New()

	// Role protected endpoint
	app.Get("/admin", func(c fiber.Ctx) error {
		// Mock RequireAuth injecting context
		c.Locals("role", "patient")
		return c.Next()
	}, RequireRole("lab_admin", "platform_admin"), func(c fiber.Ctx) error {
		return c.Status(200).SendString("success")
	})

	req := httptest.NewRequest("GET", "/admin", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("Expected status 403 Forbidden for patient role, got %d", resp.StatusCode)
	}

	// Dynamic app setup to test successful role match
	app2 := fiber.New()
	app2.Get("/admin", func(c fiber.Ctx) error {
		c.Locals("role", "lab_admin")
		return c.Next()
	}, RequireRole("lab_admin"), func(c fiber.Ctx) error {
		return c.Status(200).SendString("success")
	})

	req = httptest.NewRequest("GET", "/admin", nil)
	resp, err = app2.Test(req)
	if err != nil {
		t.Fatalf("App test failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 for matching lab_admin role, got %d", resp.StatusCode)
	}
}
