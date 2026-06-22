-- LABS TABLE
CREATE TABLE IF NOT EXISTS labs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  phone VARCHAR(50),
  latitude DOUBLE,
  longitude DOUBLE,
  accepts_home_collection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TESTS TABLE
CREATE TABLE IF NOT EXISTS tests (
  id VARCHAR(36) PRIMARY KEY,
  lab_id VARCHAR(36),
  test_name VARCHAR(255) NOT NULL,
  description TEXT,
  price_naira DECIMAL(10,2) NOT NULL,
  turnaround_hours INT DEFAULT 24,
  sample_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE
);

-- TIME SLOTS TABLE
CREATE TABLE IF NOT EXISTS time_slots (
  id VARCHAR(36) PRIMARY KEY,
  lab_id VARCHAR(36),
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  capacity INT DEFAULT 10,
  booked INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_slot (lab_id, slot_date, slot_time),
  INDEX idx_time_slots_lab (lab_id, slot_date),
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE
);

-- BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  test_id VARCHAR(36),
  time_slot_id VARCHAR(36),
  patient_name VARCHAR(255) NOT NULL,
  patient_email VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(255) NOT NULL,
  home_collection BOOLEAN DEFAULT FALSE,
  collection_address TEXT,
  payment_status VARCHAR(50) DEFAULT 'pending',
  flutterwave_ref VARCHAR(100) UNIQUE,
  total_price_naira DECIMAL(10,2),
  result_ready BOOLEAN DEFAULT FALSE,
  result_file_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bookings_email (patient_email),
  INDEX idx_bookings_payment (payment_status),
  FOREIGN KEY (test_id) REFERENCES tests(id),
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'patient', -- patient, lab_admin, platform_admin
  lab_id VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL
);

-- HEALTH CONCERNS TABLE
CREATE TABLE IF NOT EXISTS health_concerns (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TEST HEALTH CONCERNS RELATIONSHIP TABLE
CREATE TABLE IF NOT EXISTS test_health_concerns (
  test_id VARCHAR(36) NOT NULL,
  health_concern_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (test_id, health_concern_id),
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (health_concern_id) REFERENCES health_concerns(id) ON DELETE CASCADE
);

