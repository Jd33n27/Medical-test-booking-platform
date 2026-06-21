package services

import (
	"bufio"
	"os"
	"strings"
	"testing"
)

func TestSendSMSLogging(t *testing.T) {
	testPhone := "+2348081112233"
	testMessage := "Unit testing SMS message payload"

	// Trigger simulated SMS log
	err := SendSMS(testPhone, testMessage)
	if err != nil {
		t.Fatalf("Failed to execute SendSMS: %v", err)
	}

	// Verify file is created and contains log entry
	logPath := "logs/sms.log"
	if _, err := os.Stat(logPath); os.IsNotExist(err) {
		t.Fatalf("Expected SMS log file to exist at %s", logPath)
	}

	f, err := os.Open(logPath)
	if err != nil {
		t.Fatalf("Failed to open SMS log file: %v", err)
	}
	defer f.Close()

	found := false
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, testPhone) && strings.Contains(line, testMessage) {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Expected to find log entry for phone %s and message %s in log file", testPhone, testMessage)
	}
}
