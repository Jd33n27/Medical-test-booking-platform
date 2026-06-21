export interface Lab {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  latitude: number;
  longitude: number;
  accepts_home_collection: boolean;
  created_at: string;
}

export interface Test {
  id: string;
  lab_id: string;
  test_name: string;
  description: string;
  price_naira: number;
  turnaround_hours: number;
  sample_type: string;
  created_at: string;
  lab_name?: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: number;
  label: string;
}

export interface TestSlotsResponse {
  test_id: string;
  lab_id: string;
  slots: TimeSlot[];
}

export interface BookingRequest {
  test_id: string;
  time_slot_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  home_collection: boolean;
  collection_address: string | null;
  user_id?: string | null;
  promo_code?: string | null;
}

export interface BookingResponse {
  booking_id: string;
  flutterwave_link: string;
  amount: number;
  status: string;
}

export interface BookingStatus {
  booking_id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  test_name: string;
  lab_name: string;
  lab_address: string;
  result_ready: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // patient, lab_admin, platform_admin
  lab_id?: string;
  verification_status: string;
  license_number?: string;
  id_number?: string;
  verification_document?: string;
  created_at: string;
  lab_name?: string;
  lab_address?: string;
  lab_city?: string;
  lab_state?: string;
  lab_phone?: string;
  lab_latitude?: number;
  lab_longitude?: number;
  lab_accepts_home_collection?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  lab_id?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface BookingHistoryItem {
  booking_id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  test_name: string;
  lab_name: string;
  lab_address: string;
  result_ready: boolean;
  result_file_url?: string;
  total_price_naira: number;
  created_at: string;
  lab_id: string;
}

export interface ChatThread {
  id: string; // patient_id or lab_id
  name: string; // patient name or lab name
  last_message: string;
  last_message_time?: string;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  patient_id: string;
  lab_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  is_deleted?: boolean;
  edited_at?: string | null;
}
