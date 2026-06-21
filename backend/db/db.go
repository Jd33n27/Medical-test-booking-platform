package db

import (
	"database/sql"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
)

var DB *sql.DB

// InitDB initializes the database connection, runs migrations, and seeds the DB
func InitDB() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL is not set in the environment")
	}

	var err error
	DB, err = sql.Open("mysql", connStr)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Set connection limits
	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(time.Hour)

	// Ping database to verify connection
	err = DB.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Database connection established successfully")

	// Run migrations
	runMigrations()

	// Seed database
	SeedDB()
}

func runMigrations() {
	migrationPath := "db/migrations.sql"
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		migrationPath = "../db/migrations.sql"
		content, err = os.ReadFile(migrationPath)
		if err != nil {
			log.Fatalf("Failed to read migration file: %v", err)
		}
	}

	// Remove all single line comments starting with -- before splitting by semicolon
	lines := strings.Split(string(content), "\n")
	var cleanedLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		cleanedLines = append(cleanedLines, line)
	}
	cleanedSQL := strings.Join(cleanedLines, "\n")

	// Split migration statements by semicolon to execute individually
	queries := strings.Split(cleanedSQL, ";")
	for _, q := range queries {
		q = strings.TrimSpace(q)
		if q == "" {
			continue
		}
		_, err = DB.Exec(q)
		if err != nil {
			log.Fatalf("Failed to run migration query:\n%s\nError: %v", q, err)
		}
	}

	// Check if user_id column exists in bookings
	var colExists int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = 'bookings' 
		  AND column_name = 'user_id' 
		  AND table_schema = DATABASE()
	`).Scan(&colExists)
	if err == nil && colExists == 0 {
		_, err = DB.Exec("ALTER TABLE bookings ADD COLUMN user_id VARCHAR(36) NULL, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL")
		if err != nil {
			log.Printf("Warning: Failed to add user_id column to bookings: %v", err)
		} else {
			log.Println("Database column bookings.user_id added successfully")
		}
	}

	// Phase 3: Create promo_codes table
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS promo_codes (
			code VARCHAR(50) PRIMARY KEY,
			discount_percent DECIMAL(5,2) DEFAULT 0.00,
			discount_amount DECIMAL(10,2) DEFAULT 0.00,
			is_active BOOLEAN DEFAULT TRUE,
			expires_at DATE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create promo_codes table: %v", err)
	}

	// Phase 3: Add commission_rate column to labs
	var labColExists int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = 'labs' 
		  AND column_name = 'commission_rate' 
		  AND table_schema = DATABASE()
	`).Scan(&labColExists)
	if err == nil && labColExists == 0 {
		_, err = DB.Exec("ALTER TABLE labs ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 20.00")
		if err != nil {
			log.Printf("Warning: Failed to add commission_rate column to labs: %v", err)
		} else {
			log.Println("Database column labs.commission_rate added successfully")
		}
	}

	// Phase 3: Add split pricing and promo code columns to bookings
	var platformCommExists int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = 'bookings' 
		  AND column_name = 'platform_commission' 
		  AND table_schema = DATABASE()
	`).Scan(&platformCommExists)
	if err == nil && platformCommExists == 0 {
		_, err = DB.Exec(`
			ALTER TABLE bookings 
			ADD COLUMN platform_commission DECIMAL(10,2) DEFAULT 0.00,
			ADD COLUMN lab_payout DECIMAL(10,2) DEFAULT 0.00,
			ADD COLUMN promo_code VARCHAR(50) NULL,
			ADD CONSTRAINT fk_bookings_promo_code FOREIGN KEY (promo_code) REFERENCES promo_codes(code) ON DELETE SET NULL
		`)
		if err != nil {
			log.Printf("Warning: Failed to add Phase 3 columns to bookings: %v", err)
		} else {
			log.Println("Database columns platform_commission, lab_payout, promo_code added successfully to bookings")
		}
	}
	// Chat Messaging: Create chat_messages table
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS chat_messages (
			id INT AUTO_INCREMENT PRIMARY KEY,
			patient_id VARCHAR(36) NOT NULL,
			lab_id VARCHAR(36) NOT NULL,
			sender_id VARCHAR(36) NOT NULL,
			message_text TEXT NOT NULL,
			is_read BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
			FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_chats_patient_lab (patient_id, lab_id)
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create chat_messages table: %v", err)
	}

	// Add is_deleted column to chat_messages
	var isDeletedExists int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = 'chat_messages' 
		  AND column_name = 'is_deleted' 
		  AND table_schema = DATABASE()
	`).Scan(&isDeletedExists)
	if err == nil && isDeletedExists == 0 {
		_, err = DB.Exec("ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE")
		if err != nil {
			log.Printf("Warning: Failed to add is_deleted column to chat_messages: %v", err)
		} else {
			log.Println("Database column chat_messages.is_deleted added successfully")
		}
	}

	// Add edited_at column to chat_messages
	var editedAtExists int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = 'chat_messages' 
		  AND column_name = 'edited_at' 
		  AND table_schema = DATABASE()
	`).Scan(&editedAtExists)
	if err == nil && editedAtExists == 0 {
		_, err = DB.Exec("ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL")
		if err != nil {
			log.Printf("Warning: Failed to add edited_at column to chat_messages: %v", err)
		} else {
			log.Println("Database column chat_messages.edited_at added successfully")
		}
	}

	// Add user verification columns to users
	var verificationStatusExists int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = 'users' 
		  AND column_name = 'verification_status' 
		  AND table_schema = DATABASE()
	`).Scan(&verificationStatusExists)
	if err == nil && verificationStatusExists == 0 {
		_, err = DB.Exec(`
			ALTER TABLE users 
			ADD COLUMN verification_status VARCHAR(50) DEFAULT 'unverified',
			ADD COLUMN license_number VARCHAR(100) NULL,
			ADD COLUMN id_number VARCHAR(100) NULL,
			ADD COLUMN verification_document VARCHAR(255) NULL
		`)
		if err != nil {
			log.Printf("Warning: Failed to add user verification columns to users: %v", err)
		} else {
			log.Println("Database verification columns added successfully to users table")
		}
	}

	log.Println("Database migrations executed successfully")
}

// SeedDB seeds labs, tests, and time slots
func SeedDB() {
	// Phase 3: Seed promo codes (runs independently of lab checks)
	var promoCount int
	err := DB.QueryRow("SELECT COUNT(*) FROM promo_codes").Scan(&promoCount)
	if err == nil && promoCount == 0 {
		_, err = DB.Exec(`
			INSERT INTO promo_codes (code, discount_percent, discount_amount, is_active, expires_at)
			VALUES 
				('HEALTH20', 20.00, 0.00, TRUE, '2027-12-31'),
				('LAGOS5', 0.00, 500.00, TRUE, '2027-12-31')
		`)
		if err != nil {
			log.Printf("Warning: Failed to seed promo codes: %v", err)
		} else {
			log.Println("Seeded default promo codes successfully")
		}
	}

	// 1. Check if labs already exist
	var labCount int
	err = DB.QueryRow("SELECT COUNT(*) FROM labs").Scan(&labCount)
	if err != nil {
		log.Fatalf("Failed to query labs count: %v", err)
	}

	if labCount > 0 {
		log.Println("Database already has labs, skipping seed")
		return
	}

	log.Println("Seeding database...")

	// Define Labs seed data
	labs := []struct {
		Name                  string
		Address               string
		City                  string
		State                 string
		Phone                 string
		Latitude              float64
		Longitude             float64
		AcceptsHomeCollection bool
	}{
		{"Genesis Diagnostics", "123 Broad Street, Lagos Island", "Lagos", "Lagos", "+2348012345678", 6.4531, 3.3958, true},
		{"Citywide Pathology", "45 Allen Avenue, Ikeja", "Lagos", "Lagos", "+2348023456789", 6.5962, 3.3516, false},
		{"Trusted Medical Lab", "12 Constitution Hill, Wuse 2", "Abuja", "FCT", "+2348034567890", 9.0765, 7.4799, true},
		{"HealthFirst Diagnostics", "78 Ring Road, Challenge", "Ibadan", "Oyo", "+2348045678901", 7.3775, 3.9470, false},
		{"Central Lab Services", "10 Aba Road", "Port Harcourt", "Rivers", "+2348056789012", 4.8156, 7.0498, true},
	}

	// Insert Labs and keep track of IDs
	labIDs := make([]string, 0)
	for _, l := range labs {
		id := uuid.New().String()
		query := `
			INSERT INTO labs (id, name, address, city, state, phone, latitude, longitude, accepts_home_collection)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		_, err := DB.Exec(query, id, l.Name, l.Address, l.City, l.State, l.Phone, l.Latitude, l.Longitude, l.AcceptsHomeCollection)
		if err != nil {
			log.Fatalf("Failed to seed lab %s: %v", l.Name, err)
		}
		labIDs = append(labIDs, id)
	}

	log.Printf("Seeded %d labs successfully", len(labIDs))

	// Define Tests seed data (to be added to EACH lab)
	tests := []struct {
		TestName        string
		Description     string
		PriceNaira      float64
		TurnaroundHours int
		SampleType      string
	}{
		{"Full Blood Count", "Counts all blood cell types, including red cells, white cells, and platelets. Essential for screening infections or anemia.", 5500.00, 24, "Blood"},
		{"Lipid Profile", "Measures cholesterol levels (HDL, LDL) and triglycerides in your blood to evaluate heart disease risk.", 8000.00, 24, "Blood"},
		{"Typhoid Test", "Detects antibodies against Salmonella typhi to diagnose Typhoid fever.", 4500.00, 2, "Blood"},
	}

	// Insert Tests for each Lab
	testCount := 0
	for _, labID := range labIDs {
		for _, t := range tests {
			id := uuid.New().String()
			query := `
				INSERT INTO tests (id, lab_id, test_name, description, price_naira, turnaround_hours, sample_type)
				VALUES (?, ?, ?, ?, ?, ?, ?)`
			_, err := DB.Exec(query, id, labID, t.TestName, t.Description, t.PriceNaira, t.TurnaroundHours, t.SampleType)
			if err != nil {
				log.Fatalf("Failed to seed test %s for lab %s: %v", t.TestName, labID, err)
			}
			testCount++
		}
	}

	log.Printf("Seeded %d tests successfully (%d per lab)", testCount, len(tests))

	// Generate Time Slots: next 7 days, 3 slots per day (9 AM, 12 PM, 3 PM), capacity 10 each
	slotCount := 0
	times := []string{"09:00:00", "12:00:00", "15:00:00"}
	now := time.Now()

	for i := 0; i < 7; i++ {
		dateStr := now.AddDate(0, 0, i).Format("2006-01-02")
		for _, labID := range labIDs {
			for _, slotTime := range times {
				id := uuid.New().String()
				query := `
					INSERT INTO time_slots (id, lab_id, slot_date, slot_time, capacity, booked)
					VALUES (?, ?, ?, ?, ?, ?)
					ON DUPLICATE KEY UPDATE id=id`
				_, err := DB.Exec(query, id, labID, dateStr, slotTime, 10, 0)
				if err != nil {
					log.Fatalf("Failed to seed time slot on %s %s for lab %s: %v", dateStr, slotTime, labID, err)
				}
				slotCount++
			}
		}
	}

	log.Printf("Seeded %d time slots successfully", slotCount)
}
