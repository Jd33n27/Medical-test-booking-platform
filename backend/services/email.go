package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type BrevoSender struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type BrevoRecipient struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type BrevoPayload struct {
	Sender      BrevoSender      `json:"sender"`
	To          []BrevoRecipient `json:"to"`
	Subject     string           `json:"subject"`
	HTMLContent string           `json:"htmlContent"`
}

// SendConfirmationEmail sends a transactional confirmation email using Brevo.
// If BREVO_KEY is not configured or is the default, it falls back to console logging.
func SendConfirmationEmail(patientEmail, patientName, testName, labName, dateStr, timeStr, labAddress string, homeCollection bool, collectionAddress string) error {
	brevoKey := os.Getenv("BREVO_KEY")
	senderEmail := os.Getenv("SENDER_EMAIL")
	senderName := os.Getenv("SENDER_NAME")

	if senderEmail == "" {
		senderEmail = "noreply@medbook.com"
	}
	if senderName == "" {
		senderName = "MedBook"
	}

	subject := "Medical Test Booking Confirmed - " + testName

	// Construct HTML email content
	collectionInfo := "Appointment Location: <strong>" + labName + "</strong><br>Address: " + labAddress
	if homeCollection {
		collectionInfo = "Appointment Type: <strong>Home Sample Collection</strong><br>Collection Address: " + collectionAddress
	}

	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
			<h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">MedBook Appointment Confirmed</h2>
			<p>Hello %s,</p>
			<p>Your medical test booking has been successfully confirmed. Below are your appointment details:</p>
			
			<table style="width: 100%%; border-collapse: collapse; margin: 20px 0;">
				<tr style="background-color: #f9f9f9;">
					<td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Test Name:</td>
					<td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
				</tr>
				<tr>
					<td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Date:</td>
					<td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
				</tr>
				<tr style="background-color: #f9f9f9;">
					<td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Time:</td>
					<td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
				</tr>
				<tr>
					<td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Details:</td>
					<td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
				</tr>
			</table>

			<p style="background-color: #e0f2fe; color: #0369a1; padding: 12px; border-radius: 4px; font-size: 0.9em;">
				Please arrive 15 minutes before your scheduled slot. If you requested home collection, our technician will contact you shortly before arrival.
			</p>
			
			<p>Best regards,<br>The MedBook Team</p>
		</div>
	`, patientName, testName, dateStr, timeStr, collectionInfo)

	if brevoKey == "" || brevoKey == "xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx" {
		log.Println("---------------- MOCK EMAIL LOG ----------------")
		log.Printf("TO: %s (%s)\n", patientEmail, patientName)
		log.Printf("SUBJECT: %s\n", subject)
		log.Printf("BODY DETAILS: Test: %s, Lab: %s, Date: %s, Time: %s, HomeCollection: %v\n", testName, labName, dateStr, timeStr, homeCollection)
		log.Println("------------------------------------------------")
		return nil
	}

	payload := BrevoPayload{
		Sender: BrevoSender{
			Name:  senderName,
			Email: senderEmail,
		},
		To: []BrevoRecipient{
			{
				Email: patientEmail,
				Name:  patientName,
			},
		},
		Subject:     subject,
		HTMLContent: htmlContent,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}

	req.Header.Set("api-key", brevoKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo api connection failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusAccepted {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("brevo responded with status %d: %v", resp.StatusCode, errResp)
	}

	log.Printf("Confirmation email successfully sent to %s via Brevo", patientEmail)
	return nil
}

// SendResultEmail sends a diagnostic report notification email to the patient with download link.
func SendResultEmail(patientEmail, patientName, testName, labName, downloadURL string) error {
	brevoKey := os.Getenv("BREVO_KEY")
	senderEmail := os.Getenv("SENDER_EMAIL")
	senderName := os.Getenv("SENDER_NAME")

	if senderEmail == "" {
		senderEmail = "noreply@medbook.com"
	}
	if senderName == "" {
		senderName = "MedBook"
	}

	subject := "Your Diagnostic Test Results are Ready - " + testName

	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
			<h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">MedBook Diagnostic Report</h2>
			<p>Hello %s,</p>
			<p>Your results for the test <strong>%s</strong> processed by <strong>%s</strong> are now ready.</p>
			
			<p style="margin: 25px 0; text-align: center;">
				<a href="%s" target="_blank" style="background-color: #10b981; color: #0f172a; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block;">
					Download Results (PDF)
				</a>
			</p>

			<p style="background-color: #f1f5f9; color: #475569; padding: 12px; border-radius: 4px; font-size: 0.85em; text-align: left;">
				If you are having trouble downloading, you can copy and paste this URL into your browser:<br>
				<a href="%s" target="_blank" style="color: #3b82f6;">%s</a>
			</p>
			
			<p>Best regards,<br>The MedBook Team</p>
		</div>
	`, patientName, testName, labName, downloadURL, downloadURL, downloadURL)

	if brevoKey == "" || brevoKey == "xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx" {
		log.Println("---------------- MOCK RESULTS EMAIL LOG ----------------")
		log.Printf("TO: %s (%s)\n", patientEmail, patientName)
		log.Printf("SUBJECT: %s\n", subject)
		log.Printf("DOWNLOAD LINK: %s\n", downloadURL)
		log.Println("---------------------------------------------------------")
		return nil
	}

	payload := BrevoPayload{
		Sender: BrevoSender{
			Name:  senderName,
			Email: senderEmail,
		},
		To: []BrevoRecipient{
			{
				Email: patientEmail,
				Name:  patientName,
			},
		},
		Subject:     subject,
		HTMLContent: htmlContent,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}

	req.Header.Set("api-key", brevoKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo api connection failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusAccepted {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("brevo responded with status %d: %v", resp.StatusCode, errResp)
	}

	log.Printf("Results notification email successfully sent to %s via Brevo", patientEmail)
	return nil
}
