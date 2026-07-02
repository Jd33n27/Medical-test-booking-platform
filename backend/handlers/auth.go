package handlers

import (
	"database/sql"
	"fmt"
	"regexp"
	"testbooking-api/db"
	"testbooking-api/middleware"
	"testbooking-api/models"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var emailPattern = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)

// Register registers a new patient or laboratory administrator
func Register(c fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// 1. Validation
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Name, email, and password are required",
		})
	}
	if !emailPattern.MatchString(req.Email) {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "A valid email is required",
		})
	}
	if len(req.Password) < 6 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Password must be at least 6 characters long",
		})
	}

	// Default role is patient if not specified or invalid
	role := "patient"
	if req.Role == "lab_admin" {
		role = "lab_admin"
		if req.LabID == nil || *req.LabID == "" {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error":   "lab_id is required for lab administrator registration",
			})
		}
		// Verify laboratory exists
		var labExists int
		err := db.DB.QueryRow("SELECT COUNT(*) FROM labs WHERE id = ?", *req.LabID).Scan(&labExists)
		if err != nil || labExists == 0 {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error":   "Associated lab was not found",
			})
		}
	}

	// 2. Check if email is already taken
	var emailExists int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", req.Email).Scan(&emailExists)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking availability",
		})
	}
	if emailExists > 0 {
		return c.Status(409).JSON(fiber.Map{
			"success": false,
			"error":   "Email address is already registered",
		})
	}

	// 3. Hash Password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to secure password",
		})
	}
	passwordHash := string(hashedBytes)

	// 4. Insert User
	userID := uuid.New().String()
	insertQuery := `
		INSERT INTO users (id, name, email, password_hash, role, lab_id, verification_status)
		VALUES (?, ?, ?, ?, ?, ?, 'unverified')`
	
	_, err = db.DB.Exec(insertQuery, userID, req.Name, req.Email, passwordHash, role, req.LabID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   fmt.Sprintf("Failed to create user account: %v", err),
		})
	}

	// 5. Generate Auth Token
	token, err := middleware.GenerateToken(userID, role, req.LabID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Account created but login session token generation failed",
		})
	}

	fullUser, err := fetchUserProfile(userID)
	if err != nil {
		fullUser = models.User{
			ID:                 userID,
			Name:               req.Name,
			Email:              req.Email,
			Role:               role,
			LabID:              req.LabID,
			VerificationStatus: "unverified",
			CreatedAt:          time.Now(),
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.AuthResponse{
			Token: token,
			User:  fullUser,
		},
	})
}

// Login authenticates credentials and returns a session JWT token
func Login(c fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Email and password are required",
		})
	}

	// 1. Fetch user from DB
	var user models.User
	var labID sql.NullString
	var verificationStatus string
	var licenseNumber, idNumber, verificationDocument sql.NullString
	query := `
		SELECT id, name, email, password_hash, role, lab_id, verification_status, license_number, id_number, verification_document, created_at 
		FROM users 
		WHERE email = ?`

	err := db.DB.QueryRow(query, req.Email).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&labID,
		&verificationStatus,
		&licenseNumber,
		&idNumber,
		&verificationDocument,
		&user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(401).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid email or password credentials",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking credentials",
		})
	}

	user.VerificationStatus = verificationStatus
	if labID.Valid {
		user.LabID = &labID.String
	}
	if licenseNumber.Valid {
		user.LicenseNumber = &licenseNumber.String
	}
	if idNumber.Valid {
		user.IDNumber = &idNumber.String
	}
	if verificationDocument.Valid {
		user.VerificationDocument = &verificationDocument.String
	}

	// 2. Verify password hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid email or password credentials",
		})
	}

	// 3. Generate JWT Token
	token, err := middleware.GenerateToken(user.ID, user.Role, user.LabID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Session authentication failed",
		})
	}

	fullUser, err := fetchUserProfile(user.ID)
	if err == nil {
		user = fullUser
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.AuthResponse{
			Token: token,
			User:  user,
		},
	})
}

// GetProfile returns authenticated user profile info
func GetProfile(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	user, err := fetchUserProfile(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "User profile was not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error looking up profile",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// UpdateProfile updates the name, email, and health vitals of the user
func UpdateProfile(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	type UpdateReq struct {
		Name          string   `json:"name"`
		Email         string   `json:"email"`
		BloodPressure *string  `json:"blood_pressure"`
		BloodSugar    *int     `json:"blood_sugar"`
		HeightCm      *float64 `json:"height_cm"`
		WeightKg      *float64 `json:"weight_kg"`
	}

	var req UpdateReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if req.Name == "" || req.Email == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Name and email are required",
		})
	}

	if !emailPattern.MatchString(req.Email) {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "A valid email address is required",
		})
	}

	// Verify email is not already taken by another user
	var emailExists int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ? AND id != ?", req.Email, userID).Scan(&emailExists)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Database error checking availability",
		})
	}
	if emailExists > 0 {
		return c.Status(409).JSON(fiber.Map{
			"success": false,
			"error":   "Email address is already registered by another account",
		})
	}

	// Update user info including health profile vitals
	query := "UPDATE users SET name = ?, email = ?, blood_pressure = ?, blood_sugar = ?, height_cm = ?, weight_kg = ? WHERE id = ?"
	_, err = db.DB.Exec(query, req.Name, req.Email, req.BloodPressure, req.BloodSugar, req.HeightCm, req.WeightKg, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update profile",
		})
	}

	user, err := fetchUserProfile(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve updated profile details",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// VerifyProfile completes user verification fields and sets verification_status
func VerifyProfile(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	type VerifyReq struct {
		IDNumber             *string `json:"id_number"`
		LicenseNumber        *string `json:"license_number"`
		VerificationDocument *string `json:"verification_document"`
	}

	var req VerifyReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if role == "patient" {
		if req.IDNumber == nil || *req.IDNumber == "" {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error":   "ID Number / NIN is required for patient verification",
			})
		}
		_, err := db.DB.Exec("UPDATE users SET id_number = ?, verification_status = 'verified' WHERE id = ?", *req.IDNumber, userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to update verification details",
			})
		}
	} else if role == "lab_admin" {
		if req.LicenseNumber == nil || *req.LicenseNumber == "" {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error":   "Practice License Number is required for laboratory administrator verification",
			})
		}
		_, err := db.DB.Exec("UPDATE users SET license_number = ?, verification_document = ?, verification_status = 'verified' WHERE id = ?", *req.LicenseNumber, req.VerificationDocument, userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to update verification details",
			})
		}
	} else {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Verification is not applicable for this role",
		})
	}

	// Fetch updated user
	user, err := fetchUserProfile(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve verified profile details",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// fetchUserProfile queries user and optional laboratory properties (using LEFT JOIN)
func fetchUserProfile(userID string) (models.User, error) {
	var user models.User
	var labID sql.NullString
	var verificationStatus string
	var licenseNumber, idNumber, verificationDocument sql.NullString
	var labName, labAddress, labCity, labState, labPhone sql.NullString
	var labLat, labLng sql.NullFloat64
	var labHomeCol sql.NullBool
	var bp sql.NullString
	var bs sql.NullInt64
	var hc, wk sql.NullFloat64

	query := `
		SELECT u.id, u.name, u.email, u.role, u.lab_id, u.verification_status, u.license_number, u.id_number, u.verification_document, u.created_at,
		       u.blood_pressure, u.blood_sugar, u.height_cm, u.weight_kg,
		       l.name as lab_name, l.address as lab_address, l.city as lab_city, l.state as lab_state, l.phone as lab_phone,
		       l.latitude as lab_latitude, l.longitude as lab_longitude, l.accepts_home_collection as lab_accepts_home_collection
		FROM users u
		LEFT JOIN labs l ON u.lab_id = l.id
		WHERE u.id = ?`

	err := db.DB.QueryRow(query, userID).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&labID,
		&verificationStatus,
		&licenseNumber,
		&idNumber,
		&verificationDocument,
		&user.CreatedAt,
		&bp,
		&bs,
		&hc,
		&wk,
		&labName,
		&labAddress,
		&labCity,
		&labState,
		&labPhone,
		&labLat,
		&labLng,
		&labHomeCol,
	)
	if err != nil {
		return user, err
	}

	user.VerificationStatus = verificationStatus
	if labID.Valid {
		user.LabID = &labID.String
	}
	if licenseNumber.Valid {
		user.LicenseNumber = &licenseNumber.String
	}
	if idNumber.Valid {
		user.IDNumber = &idNumber.String
	}
	if verificationDocument.Valid {
		user.VerificationDocument = &verificationDocument.String
	}
	if bp.Valid {
		user.BloodPressure = &bp.String
	}
	if bs.Valid {
		val := int(bs.Int64)
		user.BloodSugar = &val
	}
	if hc.Valid {
		user.HeightCm = &hc.Float64
	}
	if wk.Valid {
		user.WeightKg = &wk.Float64
	}
	if labName.Valid {
		user.LabName = &labName.String
	}
	if labAddress.Valid {
		user.LabAddress = &labAddress.String
	}
	if labCity.Valid {
		user.LabCity = &labCity.String
	}
	if labState.Valid {
		user.LabState = &labState.String
	}
	if labPhone.Valid {
		user.LabPhone = &labPhone.String
	}
	if labLat.Valid {
		user.LabLatitude = &labLat.Float64
	}
	if labLng.Valid {
		user.LabLongitude = &labLng.Float64
	}
	if labHomeCol.Valid {
		user.LabAcceptsHomeCollection = &labHomeCol.Bool
	}

	return user, nil
}
