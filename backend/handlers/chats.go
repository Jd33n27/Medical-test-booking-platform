package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"testbooking-api/db"
	"time"

	"github.com/gofiber/fiber/v3"
)

// GetChatThreads returns active threads for the logged-in user.
func GetChatThreads(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("role").(string)

	type ChatThread struct {
		ID              string     `json:"id"`                 // patient_id or lab_id
		Name            string     `json:"name"`               // patient name or lab name
		LastMessage     string     `json:"last_message"`
		LastMessageTime *time.Time `json:"last_message_time"`
		UnreadCount     int        `json:"unread_count"`
	}

	threads := []ChatThread{}

	if userRole == "patient" {
		query := `
			SELECT 
				c.lab_id AS thread_id, 
				l.name AS thread_name, 
				COALESCE(m.message_text, '') AS last_msg, 
				m.created_at AS last_time,
				(SELECT COUNT(*) FROM chat_messages WHERE patient_id = c.patient_id AND lab_id = c.lab_id AND is_read = FALSE AND sender_id != ?) AS unread
			FROM (
				SELECT DISTINCT patient_id, lab_id FROM chat_messages WHERE patient_id = ?
			) c
			JOIN labs l ON c.lab_id = l.id
			LEFT JOIN chat_messages m ON m.id = (
				SELECT id FROM chat_messages 
				WHERE patient_id = c.patient_id AND lab_id = c.lab_id 
				ORDER BY created_at DESC LIMIT 1
			)
			ORDER BY last_time DESC`

		rows, err := db.DB.Query(query, userID, userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "error": fmt.Sprintf("Database error: %v", err)})
		}
		defer rows.Close()

		for rows.Next() {
			var t ChatThread
			var lastTime sql.NullTime
			err = rows.Scan(&t.ID, &t.Name, &t.LastMessage, &lastTime, &t.UnreadCount)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "error": "Error parsing chat threads"})
			}
			if lastTime.Valid {
				t.LastMessageTime = &lastTime.Time
			}
			threads = append(threads, t)
		}
	} else if userRole == "lab_admin" {
		var labID string
		err := db.DB.QueryRow("SELECT lab_id FROM users WHERE id = ?", userID).Scan(&labID)
		if err != nil || labID == "" {
			return c.Status(403).JSON(fiber.Map{"success": false, "error": "User is not associated with any laboratory"})
		}

		query := `
			SELECT 
				c.patient_id AS thread_id, 
				u.name AS thread_name, 
				COALESCE(m.message_text, '') AS last_msg, 
				m.created_at AS last_time,
				(SELECT COUNT(*) FROM chat_messages WHERE patient_id = c.patient_id AND lab_id = c.lab_id AND is_read = FALSE AND sender_id != ?) AS unread
			FROM (
				SELECT DISTINCT patient_id, lab_id FROM chat_messages WHERE lab_id = ?
			) c
			JOIN users u ON c.patient_id = u.id
			LEFT JOIN chat_messages m ON m.id = (
				SELECT id FROM chat_messages 
				WHERE patient_id = c.patient_id AND lab_id = c.lab_id 
				ORDER BY created_at DESC LIMIT 1
			)
			ORDER BY last_time DESC`

		rows, err := db.DB.Query(query, userID, labID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "error": fmt.Sprintf("Database error: %v", err)})
		}
		defer rows.Close()

		for rows.Next() {
			var t ChatThread
			var lastTime sql.NullTime
			err = rows.Scan(&t.ID, &t.Name, &t.LastMessage, &lastTime, &t.UnreadCount)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "error": "Error parsing chat threads"})
			}
			if lastTime.Valid {
				t.LastMessageTime = &lastTime.Time
			}
			threads = append(threads, t)
		}
	} else {
		return c.Status(403).JSON(fiber.Map{"success": false, "error": "Unauthorized role"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    threads,
	})
}

// GetChatMessages fetches the conversation messages between a patient and a lab.
// It also marks incoming messages as read.
func GetChatMessages(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("role").(string)

	var patientID, labID string

	if userRole == "patient" {
		patientID = userID
		labID = c.Query("lab_id")
		if labID == "" {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": "lab_id query parameter is required"})
		}
	} else if userRole == "lab_admin" {
		err := db.DB.QueryRow("SELECT lab_id FROM users WHERE id = ?", userID).Scan(&labID)
		if err != nil || labID == "" {
			return c.Status(403).JSON(fiber.Map{"success": false, "error": "User is not associated with any laboratory"})
		}
		patientID = c.Query("patient_id")
		if patientID == "" {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": "patient_id query parameter is required"})
		}
	} else {
		return c.Status(403).JSON(fiber.Map{"success": false, "error": "Unauthorized role"})
	}

	// 1. Mark all unread messages sent by the OTHER party in this thread as read
	_, err := db.DB.Exec(`
		UPDATE chat_messages 
		SET is_read = TRUE 
		WHERE patient_id = ? AND lab_id = ? AND sender_id != ?`,
		patientID, labID, userID)
	if err != nil {
		log.Printf("Failed to mark messages as read: %v", err)
	}

	// 2. Fetch the conversation messages
	rows, err := db.DB.Query(`
		SELECT id, patient_id, lab_id, sender_id, message_text, is_read, created_at, is_deleted, edited_at
		FROM chat_messages
		WHERE patient_id = ? AND lab_id = ?
		ORDER BY created_at ASC`,
		patientID, labID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error fetching messages"})
	}
	defer rows.Close()

	type ChatMessage struct {
		ID          int        `json:"id"`
		PatientID   string     `json:"patient_id"`
		LabID       string     `json:"lab_id"`
		SenderID    string     `json:"sender_id"`
		MessageText string     `json:"message_text"`
		IsRead      bool       `json:"is_read"`
		CreatedAt   time.Time  `json:"created_at"`
		IsDeleted   bool       `json:"is_deleted"`
		EditedAt    *time.Time `json:"edited_at,omitempty"`
	}

	messages := []ChatMessage{}
	for rows.Next() {
		var m ChatMessage
		var editedAt sql.NullTime
		err = rows.Scan(&m.ID, &m.PatientID, &m.LabID, &m.SenderID, &m.MessageText, &m.IsRead, &m.CreatedAt, &m.IsDeleted, &editedAt)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "error": "Error parsing chat messages"})
		}
		if editedAt.Valid {
			m.EditedAt = &editedAt.Time
		}
		if m.IsDeleted {
			m.MessageText = ""
		}
		messages = append(messages, m)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    messages,
	})
}

// SendChatMessage saves a new message in the database and triggers notifications.
func SendChatMessage(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("role").(string)

	type SendRequest struct {
		LabID       string `json:"lab_id"`
		PatientID   string `json:"patient_id"`
		MessageText string `json:"message_text"`
	}

	var req SendRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	if req.MessageText == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "message_text cannot be empty"})
	}

	var patientID, labID string

	if userRole == "patient" {
		patientID = userID
		labID = req.LabID
		if labID == "" {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": "lab_id is required"})
		}
	} else if userRole == "lab_admin" {
		err := db.DB.QueryRow("SELECT lab_id FROM users WHERE id = ?", userID).Scan(&labID)
		if err != nil || labID == "" {
			return c.Status(403).JSON(fiber.Map{"success": false, "error": "User is not associated with any laboratory"})
		}
		patientID = req.PatientID
		if patientID == "" {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": "patient_id is required"})
		}
	} else {
		return c.Status(403).JSON(fiber.Map{"success": false, "error": "Unauthorized role"})
	}

	// 1. Insert message
	res, err := db.DB.Exec(`
		INSERT INTO chat_messages (patient_id, lab_id, sender_id, message_text, is_read)
		VALUES (?, ?, ?, ?, FALSE)`,
		patientID, labID, userID, req.MessageText)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error saving message"})
	}

	msgID, _ := res.LastInsertId()

	// 2. Fetch sender name and recipient details for notifications
	var senderName, recipientName string
	_ = db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&senderName)

	var notificationTarget string
	if userRole == "patient" {
		_ = db.DB.QueryRow("SELECT name FROM labs WHERE id = ?", labID).Scan(&recipientName)
		notificationTarget = "Lab Admin at " + recipientName
	} else {
		_ = db.DB.QueryRow("SELECT name FROM users WHERE id = ?", patientID).Scan(&recipientName)
		notificationTarget = recipientName
	}

	// Log simulated notification to notification log file
	logNotification(senderName, notificationTarget, req.MessageText)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":           msgID,
			"patient_id":   patientID,
			"lab_id":       labID,
			"sender_id":    userID,
			"message_text": req.MessageText,
			"is_read":      false,
			"created_at":   time.Now(),
		},
	})
}

func logNotification(senderName, recipientName, messageText string) {
	logDir := "logs"
	if _, err := os.Stat(logDir); os.IsNotExist(err) {
		_ = os.Mkdir(logDir, 0755)
	}

	logFile := "logs/notifications.log"
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Failed to open notifications log: %v", err)
		return
	}
	defer f.Close()

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	snippet := messageText
	if len(snippet) > 60 {
		snippet = snippet[:57] + "..."
	}

	logEntry := fmt.Sprintf("[%s] CHAT NOTIFICATION -> From: %s | To: %s | Message: \"%s\"\n",
		timestamp, senderName, recipientName, snippet)

	_, _ = f.WriteString(logEntry)
	log.Printf("%s", logEntry)
}

// EditChatMessage edits a message sent by the user
func EditChatMessage(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	messageID := c.Params("message_id")
	if messageID == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Message ID parameter is required"})
	}

	type EditRequest struct {
		MessageText string `json:"message_text"`
	}

	var req EditRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	if req.MessageText == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "message_text cannot be empty"})
	}

	// Fetch current message details to check existence, ownership, and deletion status
	var senderID string
	var isDeleted bool
	var patientID, labID string
	var isRead bool
	var createdAt time.Time

	err := db.DB.QueryRow(`
		SELECT sender_id, is_deleted, patient_id, lab_id, is_read, created_at 
		FROM chat_messages 
		WHERE id = ?`, messageID).Scan(&senderID, &isDeleted, &patientID, &labID, &isRead, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"success": false, "error": "Message not found"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error checking message details"})
	}

	if senderID != userID {
		return c.Status(403).JSON(fiber.Map{"success": false, "error": "You can only edit your own messages"})
	}

	if isDeleted {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Cannot edit a deleted message"})
	}

	// Perform update
	_, err = db.DB.Exec(`
		UPDATE chat_messages 
		SET message_text = ?, edited_at = NOW() 
		WHERE id = ? AND sender_id = ? AND is_deleted = FALSE`,
		req.MessageText, messageID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error updating message"})
	}

	// Fetch updated message
	var updatedEditedAt sql.NullTime
	err = db.DB.QueryRow(`
		SELECT edited_at 
		FROM chat_messages 
		WHERE id = ?`, messageID).Scan(&updatedEditedAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error fetching updated details"})
	}

	var editTime *time.Time
	if updatedEditedAt.Valid {
		editTime = &updatedEditedAt.Time
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":           messageID,
			"patient_id":   patientID,
			"lab_id":       labID,
			"sender_id":    senderID,
			"message_text": req.MessageText,
			"is_read":      isRead,
			"created_at":   createdAt,
			"is_deleted":   false,
			"edited_at":    editTime,
		},
	})
}

// DeleteChatMessage soft-deletes a message sent by the user
func DeleteChatMessage(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	messageID := c.Params("message_id")
	if messageID == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Message ID parameter is required"})
	}

	// Check existence and ownership
	var senderID string
	err := db.DB.QueryRow("SELECT sender_id FROM chat_messages WHERE id = ?", messageID).Scan(&senderID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"success": false, "error": "Message not found"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error checking message details"})
	}

	if senderID != userID {
		return c.Status(403).JSON(fiber.Map{"success": false, "error": "You can only delete your own messages"})
	}

	// Update is_deleted flag to true
	_, err = db.DB.Exec("UPDATE chat_messages SET is_deleted = TRUE WHERE id = ? AND sender_id = ?", messageID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error deleting message"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Message deleted successfully",
	})
}
