package main

import (
	"log"
	"os"
	"testbooking-api/db"
	"testbooking-api/handlers"
	"testbooking-api/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load env variables from .env file (if it exists, in production they are environment variables)
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: .env file not found, reading from environment variables")
	}

	// 2. Initialize database connection + migrations + seeds
	db.InitDB()
	defer db.DB.Close()

	// 3. Create Fiber application
	app := fiber.New(fiber.Config{
		AppName: "MedBook API v1.0",
	})

	// 4. Use CORS middleware
	app.Use(middleware.SetupCORS())

	// Serve static uploads (diagnostic PDF reports)
	app.Get("/uploads/*", static.New("./uploads"))

	// 5. Register Routes
	api := app.Group("/api")

	// Labs (Public listings)
	api.Get("/labs", handlers.GetLabs)
	api.Get("/labs/list", handlers.GetLabsList)

	// Tests & Slots (Public catalog)
	api.Get("/tests", handlers.GetTests)
	api.Get("/tests/:test_id/slots", handlers.GetTestSlots)
	api.Get("/health-concerns", handlers.GetHealthConcerns)


	// Bookings & Payments (Core flow)
	api.Post("/bookings", handlers.CreateBooking)
	api.Get("/bookings/:booking_id/status", handlers.GetBookingStatus)
	api.Get("/bookings/:booking_id/mock-pay", handlers.MockPayBooking)
	api.Get("/promos/validate", handlers.ValidatePromo)

	// Webhooks
	api.Post("/webhooks/flutterwave", handlers.FlutterwaveWebhook)

	// Auth
	api.Post("/auth/register", handlers.Register)
	api.Post("/auth/login", handlers.Login)
	api.Get("/auth/me", middleware.RequireAuth, handlers.GetProfile)
	api.Put("/auth/profile", middleware.RequireAuth, handlers.UpdateProfile)
	api.Post("/auth/profile/verify", middleware.RequireAuth, handlers.VerifyProfile)
	api.Post("/labs/onboard", handlers.OnboardLab)

	// Bookings History (Patient portal)
	api.Get("/bookings", middleware.RequireAuth, handlers.GetPatientBookings)

	// Chat Messaging (Telegram-style patient/lab chats)
	api.Get("/chats/threads", middleware.RequireAuth, handlers.GetChatThreads)
	api.Get("/chats/messages", middleware.RequireAuth, handlers.GetChatMessages)
	api.Post("/chats/messages", middleware.RequireAuth, handlers.SendChatMessage)
	api.Put("/chats/messages/:message_id", middleware.RequireAuth, handlers.EditChatMessage)
	api.Delete("/chats/messages/:message_id", middleware.RequireAuth, handlers.DeleteChatMessage)

	// Lab Partner Portal (Protected admin paths)
	labGroup := api.Group("/labs", middleware.RequireAuth, middleware.RequireRole("lab_admin"))
	labGroup.Get("/bookings", handlers.GetLabBookings)
	labGroup.Post("/bookings/:booking_id/upload", handlers.UploadDiagnosticResult)
	labGroup.Delete("/bookings/:booking_id/result", handlers.RemoveDiagnosticResult)
	labGroup.Put("/tests/:test_id", handlers.UpdateLabTest)

	// 6. Get Port and start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("Starting server on port %s...", port)
	err = app.Listen(":" + port)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
