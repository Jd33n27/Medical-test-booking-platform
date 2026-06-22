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

	// Seed health concerns and map tests
	seedHealthConcerns()


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
	type SeedTest struct {
		TestName        string
		Description     string
		PriceNaira      float64
		TurnaroundHours int
		SampleType      string
	}

	labs := []struct {
		Name                  string
		Address               string
		City                  string
		State                 string
		Phone                 string
		Latitude              float64
		Longitude             float64
		AcceptsHomeCollection bool
		Tests                 []SeedTest
	}{
		{
			"Genesis Diagnostics", "123 Broad Street, Lagos Island", "Lagos", "Lagos", "+2348012345678", 6.4531, 3.3958, true,
			[]SeedTest{
				{"Full Blood Count", "Counts all blood cell types, including red cells, white cells, and platelets. Essential for screening infections or anemia.", 5500.00, 24, "Blood"},
				{"Malaria Parasite Smear", "Microscopic examination of blood smears to detect and identify Malaria parasites.", 3000.00, 4, "Blood"},
				{"Typhoid Widal Test", "Agglutination test to detect antibodies against Salmonella typhi (Typhoid).", 4500.00, 2, "Blood"},
			},
		},
		{
			"Citywide Pathology", "45 Allen Avenue, Ikeja", "Lagos", "Lagos", "+2348023456789", 6.5962, 3.3516, false,
			[]SeedTest{
				{"Lipid Profile", "Measures cholesterol levels (HDL, LDL) and triglycerides in your blood to evaluate heart disease risk.", 8000.00, 24, "Blood"},
				{"Liver Function Test", "Assesses enzymes and proteins (AST, ALT, Bilirubin) to evaluate liver health.", 12000.00, 24, "Blood"},
				{"Urinalysis", "Chemical and microscopic analysis of urine to check for UTIs, diabetes, or kidney issues.", 2500.00, 2, "Urine"},
			},
		},
		{
			"Trusted Medical Lab", "12 Constitution Hill, Wuse 2", "Abuja", "FCT", "+2348034567890", 9.0765, 7.4799, true,
			[]SeedTest{
				{"Fasting Blood Sugar", "Measures glucose levels in your blood after fasting to screen for diabetes.", 2000.00, 4, "Blood"},
				{"HbA1c (Glycated Hemoglobin)", "Measures average blood sugar levels over the past 3 months to monitor diabetes control.", 7500.00, 24, "Blood"},
				{"Kidney Function Test", "Measures creatinine and urea to assess kidney filtration efficiency.", 15000.00, 24, "Blood"},
			},
		},
		{
			"HealthFirst Diagnostics", "78 Ring Road, Challenge", "Ibadan", "Oyo", "+2348045678901", 7.3775, 3.9470, false,
			[]SeedTest{
				{"Full Blood Count", "Counts red/white blood cells and platelets to screen for anemia and infection.", 5500.00, 24, "Blood"},
				{"Pregnancy HCG Test", "Measures human chorionic gonadotropin in blood to confirm pregnancy.", 3500.00, 2, "Blood"},
				{"Hepatitis B Screen", "Detects Hepatitis B surface antigen to screen for acute or chronic infection.", 6000.00, 24, "Blood"},
			},
		},
		{
			"Central Lab Services", "10 Aba Road", "Port Harcourt", "Rivers", "+2348056789012", 4.8156, 7.0498, true,
			[]SeedTest{
				{"Thyroid Function Panel", "Measures T3, T4, and TSH to evaluate thyroid gland activity and metabolism.", 16000.00, 48, "Blood"},
				{"Electrolytes & Creatinine", "Measures sodium, potassium, and creatinine to check hydration and renal function.", 9000.00, 24, "Blood"},
				{"HIV Screening Test", "Detects HIV antibodies and antigens to screen for infection.", 5000.00, 24, "Blood"},
			},
		},
		{
			"Kano Premier Diagnostics", "45 Zoo Road", "Kano", "Kano", "+2348061234567", 11.9876, 8.5321, true,
			[]SeedTest{
				{"Malaria Parasite Smear", "Microscopic examination of blood smears to detect and identify Malaria parasites.", 3000.00, 4, "Blood"},
				{"Typhoid Widal Test", "Agglutination test to detect antibodies against Salmonella typhi (Typhoid).", 4000.00, 2, "Blood"},
				{"Full Blood Count", "Counts red/white blood cells and platelets to screen for anemia and infection.", 5500.00, 24, "Blood"},
			},
		},
		{
			"Kaduna Scientific Labs", "12 Independence Way", "Kaduna", "Kaduna", "+2348072345678", 10.5186, 7.4208, false,
			[]SeedTest{
				{"Prostate Specific Antigen", "Measures PSA levels in blood to screen for prostate cancer or enlargement.", 10000.00, 24, "Blood"},
				{"Fasting Blood Sugar", "Measures glucose levels in your blood after fasting to screen for diabetes.", 2000.00, 4, "Blood"},
				{"Lipid Profile", "Measures cholesterol levels (HDL, LDL) and triglycerides in your blood to evaluate heart disease risk.", 8000.00, 24, "Blood"},
			},
		},
		{
			"Coal City Pathology", "8 Ogui Road", "Enugu", "Enugu", "+2348083456789", 6.4281, 7.4951, true,
			[]SeedTest{
				{"Basic Electrolyte Panel", "Checks sodium, potassium, and chloride levels for fluid balance.", 7000.00, 12, "Blood"},
				{"Kidney Function Test", "Measures creatinine and urea to assess kidney filtration efficiency.", 14000.00, 24, "Blood"},
				{"Liver Function Test", "Assesses enzymes and proteins (AST, ALT, Bilirubin) to evaluate liver health.", 11000.00, 24, "Blood"},
			},
		},
		{
			"Benin Medical Research Lab", "15 Airport Road", "Benin City", "Edo", "+2348094567890", 6.3350, 5.6269, false,
			[]SeedTest{
				{"Blood Culture & Sensitivity", "Detects bacteria or fungi in the blood to diagnose systemic infections.", 15000.00, 72, "Blood"},
				{"Urine Culture & Sensitivity", "Detects and identifies bacteria in urine to diagnose UTIs and test antibiotic efficacy.", 6500.00, 48, "Urine"},
				{"Malaria Parasite Smear", "Microscopic examination of blood smears to detect and identify Malaria parasites.", 3000.00, 4, "Blood"},
			},
		},
		{
			"Calabar Diagnostics Centre", "80 Marian Road", "Calabar", "Cross River", "+2348105678901", 4.9757, 8.3417, true,
			[]SeedTest{
				{"Vitamin D (25-Hydroxy)", "Measures vitamin D levels to assess bone health and immune function.", 25000.00, 48, "Blood"},
				{"Lipid Profile", "Measures cholesterol levels (HDL, LDL) and triglycerides in your blood to evaluate heart disease risk.", 9000.00, 24, "Blood"},
				{"Full Blood Count", "Counts all blood cell types, including red cells, white cells, and platelets.", 5500.00, 24, "Blood"},
			},
		},
		{
			"Akwa Ibom Diagnostic Hub", "102 Ikot Ekpene Road", "Uyo", "Akwa Ibom", "+2348116789012", 5.0333, 7.9266, true,
			[]SeedTest{
				{"Syphilis VDRL Screen", "Detects antibodies to screen for Syphilis infection.", 3000.00, 12, "Blood"},
				{"Hepatitis C Antibody Screen", "Detects antibodies against the Hepatitis C virus in blood.", 7000.00, 24, "Blood"},
				{"Full Blood Count", "Counts all blood cell types, including red cells, white cells, and platelets.", 5500.00, 24, "Blood"},
			},
		},
		{
			"Aba Clinical Laboratories", "15 Faulks Road", "Aba", "Abia", "+2348127890123", 5.1216, 7.3733, false,
			[]SeedTest{
				{"Typhoid Widal Test", "Agglutination test to detect antibodies against Salmonella typhi (Typhoid).", 4000.00, 2, "Blood"},
				{"Blood Grouping & Genotype", "Determines ABO/Rhesus blood group and hemoglobin genotype (AA, AS, SS).", 5000.00, 4, "Blood"},
				{"Urinalysis", "Chemical and microscopic analysis of urine to check for UTIs, diabetes, or kidney issues.", 2500.00, 2, "Urine"},
			},
		},
		{
			"Jos Highland Labs", "6 Yakubu Gowon Way", "Jos", "Plateau", "+2348138901234", 9.8965, 8.8583, true,
			[]SeedTest{
				{"Rheumatoid Factor (RF) Screen", "Detects RF antibodies associated with rheumatoid arthritis.", 8000.00, 24, "Blood"},
				{"Serum Uric Acid", "Measures uric acid levels to diagnose gout or monitor kidney function.", 4500.00, 12, "Blood"},
				{"Serum Calcium Level", "Measures calcium levels to screen for bone, kidney, or parathyroid conditions.", 5000.00, 24, "Blood"},
			},
		},
		{
			"Ilorin Wellness Diagnostics", "88 Taiwo Road", "Ilorin", "Kwara", "+2348149012345", 8.4799, 4.5418, false,
			[]SeedTest{
				{"Lipid Profile", "Measures cholesterol levels (HDL, LDL) and triglycerides in your blood to evaluate heart disease risk.", 8000.00, 24, "Blood"},
				{"Thyroid TSH Screen", "Measures thyroid stimulating hormone to screen for thyroid disorders.", 7000.00, 24, "Blood"},
				{"Fasting Blood Sugar", "Measures glucose levels in your blood after fasting to screen for diabetes.", 3000.00, 4, "Blood"},
			},
		},
		{
			"Abeokuta Pathology Services", "12 Lalubu Street", "Abeokuta", "Ogun", "+2348150123456", 7.1557, 3.3444, true,
			[]SeedTest{
				{"Packed Cell Volume (PCV)", "Measures percentage of blood volume occupied by red blood cells to check for anemia.", 2500.00, 2, "Blood"},
				{"Fasting Blood Sugar", "Measures glucose levels in your blood after fasting to screen for diabetes.", 2000.00, 4, "Blood"},
				{"Hepatitis B & C Combo Screen", "Dual screening for Hepatitis B and Hepatitis C virus infections.", 11000.00, 24, "Blood"},
			},
		},
	}

	// Insert Labs and keep track of IDs
	labIDs := make([]string, 0)
	testCount := 0
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

		for _, t := range l.Tests {
			testID := uuid.New().String()
			testQuery := `
				INSERT INTO tests (id, lab_id, test_name, description, price_naira, turnaround_hours, sample_type)
				VALUES (?, ?, ?, ?, ?, ?, ?)`
			_, err := DB.Exec(testQuery, testID, id, t.TestName, t.Description, t.PriceNaira, t.TurnaroundHours, t.SampleType)
			if err != nil {
				log.Fatalf("Failed to seed test %s for lab %s: %v", t.TestName, l.Name, err)
			}
			testCount++
		}
	}

	log.Printf("Seeded %d labs and %d custom tests successfully", len(labIDs), testCount)

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

func seedHealthConcerns() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM health_concerns").Scan(&count)
	if err != nil {
		log.Printf("Warning: Failed to query health concerns count: %v", err)
		return
	}

	concerns := []struct {
		ID          string
		Name        string
		Description string
		Icon        string
	}{
		{"hc-diabetes", "Diabetes", "Monitor blood glucose levels and manage diabetes risk.", "Activity"},
		{"hc-heart", "Heart Health", "Assess cholesterol levels and cardiovascular risk factors.", "Heart"},
		{"hc-kidney", "Kidney Health", "Evaluate renal function, hydration, and filtration efficiency.", "Activity"},
		{"hc-liver", "Liver Health", "Check enzymes and proteins to monitor liver function and health.", "Shield"},
		{"hc-infectious", "Infectious Disease", "Screen for malaria, typhoid, viral hepatitis, and systemic infections.", "Bug"},
		{"hc-sexual", "Sexual Health", "Confidential screening for HIV, syphilis, and other viral infections.", "HeartHandshake"},
		{"hc-pregnancy", "Pregnancy & Women's Health", "Confirm pregnancy and monitor prenatal health indicators.", "Sparkles"},
		{"hc-thyroid", "Thyroid Health", "Measure thyroid hormones to evaluate metabolism and energy levels.", "Flame"},
		{"hc-bone", "Bone & Joint Health", "Assess calcium, uric acid, and vitamin D for skeletal integrity.", "Bone"},
		{"hc-wellness", "General Wellness", "Routine checkups including blood count, blood group, and basic profiles.", "CheckCircle"},
	}

	if count == 0 {
		for _, hc := range concerns {
			_, err = DB.Exec(`
				INSERT INTO health_concerns (id, name, description, icon)
				VALUES (?, ?, ?, ?)
			`, hc.ID, hc.Name, hc.Description, hc.Icon)
			if err != nil {
				log.Printf("Warning: Failed to insert health concern %s: %v", hc.Name, err)
			}
		}
		log.Println("Seeded health concerns successfully")
	}

	// Always make sure junction mappings are populated
	_, err = DB.Exec("DELETE FROM test_health_concerns")
	if err == nil {
		// Fetch all tests
		rows, err := DB.Query("SELECT id, test_name FROM tests")
		if err != nil {
			log.Printf("Warning: Failed to query tests for concern mapping: %v", err)
			return
		}
		defer rows.Close()

		type testInfo struct {
			ID   string
			Name string
		}
		var allTests []testInfo
		for rows.Next() {
			var t testInfo
			if err := rows.Scan(&t.ID, &t.Name); err == nil {
				allTests = append(allTests, t)
			}
		}

		// Helper maps keywords to concern IDs
		mappings := map[string][]string{
			"hc-diabetes":   {"sugar", "glucose", "hba1c", "diabetes"},
			"hc-heart":      {"lipid", "cholesterol", "heart", "cardio"},
			"hc-kidney":     {"kidney", "creatinine", "urinalysis", "urine", "renal", "uric", "electrolyte"},
			"hc-liver":      {"liver", "hepatitis", "bilirubin", "ast", "alt"},
			"hc-infectious": {"malaria", "typhoid", "culture", "hepatitis", "hiv", "syphilis", "vdrl", "widal", "parasite", "tuberculosis", "infection"},
			"hc-sexual":     {"hiv", "syphilis", "vdrl", "hepatitis", "prostate", "psa"},
			"hc-pregnancy":  {"pregnancy", "hcg", "prenatal"},
			"hc-thyroid":    {"thyroid", "tsh", "t3", "t4"},
			"hc-bone":       {"vitamin d", "rheumatoid", "calcium", "joint", "bone"},
			"hc-wellness":   {"blood", "pcv", "wellness", "health", "screen", "checkup", "panel", "urine", "urinalysis"},
		}

		insertedCount := 0
		for _, test := range allTests {
			testNameLower := strings.ToLower(test.Name)
			for concernID, keywords := range mappings {
				match := false
				for _, kw := range keywords {
					if strings.Contains(testNameLower, kw) {
						match = true
						break
					}
				}
				if match {
					_, err = DB.Exec(`
						INSERT INTO test_health_concerns (test_id, health_concern_id)
						VALUES (?, ?)
						ON DUPLICATE KEY UPDATE test_id=test_id
					`, test.ID, concernID)
					if err == nil {
						insertedCount++
					} else {
						log.Printf("Warning: Failed to map test %s to concern %s: %v", test.Name, concernID, err)
					}
				}
			}
		}
		log.Printf("Mapped %d test-concern relationships successfully", insertedCount)
	}
}

