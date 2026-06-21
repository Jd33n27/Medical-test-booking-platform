package services

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// SendSMS simulates sending an SMS and writes it to logs/sms.log
func SendSMS(to string, message string) error {
	// Ensure logs directory exists
	logsDir := "logs"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		log.Printf("Warning: Failed to create logs directory: %v", err)
	}

	logPath := filepath.Join(logsDir, "sms.log")
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Warning: Failed to open SMS log file: %v", err)
	} else {
		defer f.Close()
		timestamp := time.Now().Format(time.RFC3339)
		logEntry := fmt.Sprintf("[%s] To: %s | Message: %s\n", timestamp, to, message)
		if _, err := f.WriteString(logEntry); err != nil {
			log.Printf("Warning: Failed to write to SMS log file: %v", err)
		}
	}

	// Output distinct highlights to server terminal
	fmt.Printf("\n--- ⚡ [SMS NOTIFICATION SENT] ---\nRecipient: %s\nMessage:   %s\n----------------------------------\n\n", to, message)
	return nil
}
