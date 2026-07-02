import axios from 'axios';
import { 
  Lab, Test, TestSlotsResponse, BookingRequest, BookingResponse, BookingStatus, APIResponse,
  User, LoginRequest, RegisterRequest, AuthResponse, BookingHistoryItem, HealthConcern, Review
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://medical-test-booking-platform.onrender.com'
    : 'http://localhost:5000');

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT bearer token if configured
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('medbook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Fetch all labs
  async getLabs(): Promise<Lab[]> {
    const response = await client.get<APIResponse<Lab[]>>('/api/labs');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch labs');
    }
    return response.data.data;
  },

  // Fetch all tests, optional lab_id filter, search term, and health concern
  async getTests(labId?: string, search?: string, healthConcernId?: string): Promise<Test[]> {
    const params: Record<string, string> = {};
    if (labId) params.lab_id = labId;
    if (search) params.search = search;
    if (healthConcernId) params.health_concern_id = healthConcernId;

    const response = await client.get<APIResponse<Test[]>>('/api/tests', { params });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch tests');
    }
    return response.data.data;
  },

  // Fetch slots for a specific test
  async getTestSlots(testId: string): Promise<TestSlotsResponse> {
    const response = await client.get<APIResponse<TestSlotsResponse>>(`/api/tests/${testId}/slots`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch slots');
    }
    return response.data.data;
  },

  // Create booking
  async createBooking(bookingData: BookingRequest): Promise<BookingResponse> {
    const response = await client.post<APIResponse<BookingResponse>>('/api/bookings', bookingData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create booking');
    }
    return response.data.data;
  },

  // Check booking status
  async getBookingStatus(bookingId: string): Promise<BookingStatus> {
    const response = await client.get<APIResponse<BookingStatus>>(`/api/bookings/${bookingId}/status`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch booking status');
    }
    return response.data.data;
  },

  // Authenticate user login
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const response = await client.post<APIResponse<AuthResponse>>('/api/auth/login', loginData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed');
    }
    return response.data.data;
  },

  // Register new account
  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const response = await client.post<APIResponse<AuthResponse>>('/api/auth/register', registerData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed');
    }
    return response.data.data;
  },

  // Fetch logged-in user profile info
  async getProfile(): Promise<User> {
    const response = await client.get<APIResponse<User>>('/api/auth/me');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch profile details');
    }
    return response.data.data;
  },

  // Fetch patient bookings history
  async getBookingHistory(): Promise<BookingHistoryItem[]> {
    const response = await client.get<APIResponse<BookingHistoryItem[]>>('/api/bookings');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch booking history log');
    }
    return response.data.data;
  },

  // Cancel an appointment
  async cancelAppointment(bookingId: string): Promise<any> {
    const response = await client.put<APIResponse<any>>(`/api/appointments/${bookingId}/cancel`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to cancel appointment');
    }
    return response.data;
  },

  // Reschedule an appointment
  async rescheduleAppointment(bookingId: string, timeSlotId: string): Promise<any> {
    const response = await client.put<APIResponse<any>>(`/api/appointments/${bookingId}/reschedule`, { time_slot_id: timeSlotId });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to reschedule appointment');
    }
    return response.data;
  },

  // Fetch all bookings assigned to the active lab admin's laboratory
  async getLabBookings(): Promise<any[]> {
    const response = await client.get<APIResponse<any[]>>('/api/labs/bookings');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch lab bookings');
    }
    return response.data.data;
  },

  // Upload diagnostic report PDF for a booking
  async uploadResult(bookingId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('result_file', file);
    const response = await client.post<APIResponse<any>>(`/api/labs/bookings/${bookingId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload diagnostic report file');
    }
    return response.data.data;
  },

  // Edit diagnostic test parameters
  async updateLabTest(testId: string, updateData: { price_naira: number; description: string; turnaround_hours: number }): Promise<any> {
    const response = await client.put<APIResponse<any>>(`/api/labs/tests/${testId}`, updateData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update test catalog parameters');
    }
    return response.data.data;
  },

  // Validate promotional discount code
  async validatePromo(code: string): Promise<any> {
    const response = await client.get<APIResponse<any>>('/api/promos/validate', { params: { code } });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Invalid promo code');
    }
    return response.data.data;
  },

  // Enroll a new laboratory partner self-serve
  async onboardLab(labData: any): Promise<any> {
    const response = await client.post<APIResponse<any>>('/api/labs/onboard', labData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to onboard lab');
    }
    return response.data.data;
  },

  // Retrieve minimal lab name dictionary lookup
  async getLabsList(): Promise<any[]> {
    const response = await client.get<APIResponse<any[]>>('/api/labs/list');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch lab listings');
    }
    return response.data.data;
  },

  // Fetch all health concerns
  async getHealthConcerns(): Promise<HealthConcern[]> {
    const response = await client.get<APIResponse<HealthConcern[]>>('/api/health-concerns');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch health concerns');
    }
    return response.data.data;
  },

  // Get active messaging conversation threads
  async getChatThreads(): Promise<any[]> {
    const response = await client.get<APIResponse<any[]>>('/api/chats/threads');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch chat threads');
    }
    return response.data.data;
  },

  // Get messages in a conversation
  async getChatMessages(params: { lab_id?: string; patient_id?: string }): Promise<any[]> {
    const response = await client.get<APIResponse<any[]>>('/api/chats/messages', { params });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch conversation history');
    }
    return response.data.data;
  },

  // Send a new chat message
  async sendChatMessage(messageData: { lab_id?: string; patient_id?: string; message_text: string }): Promise<any> {
    const response = await client.post<APIResponse<any>>('/api/chats/messages', messageData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to dispatch chat message');
    }
    return response.data.data;
  },

  // Edit an existing chat message
  async editChatMessage(messageId: number, messageText: string): Promise<any> {
    const response = await client.put<APIResponse<any>>(`/api/chats/messages/${messageId}`, { message_text: messageText });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to edit chat message');
    }
    return response.data.data;
  },

  // Delete an existing chat message
  async deleteChatMessage(messageId: number): Promise<any> {
    const response = await client.delete<APIResponse<any>>(`/api/chats/messages/${messageId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete chat message');
    }
    return response.data.data;
  },

  // Remove uploaded diagnostic result PDF
  async removeResult(bookingId: string): Promise<any> {
    const response = await client.delete<APIResponse<any>>(`/api/labs/bookings/${bookingId}/result`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove diagnostic report');
    }
    return response.data.data;
  },

  // Update authenticated user profile details and health vitals
  async updateProfile(profileData: { 
    name: string; 
    email: string; 
    blood_pressure?: string; 
    blood_sugar?: number; 
    height_cm?: number; 
    weight_kg?: number; 
  }): Promise<User> {
    const response = await client.put<APIResponse<User>>('/api/auth/profile', profileData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update profile details');
    }
    return response.data.data;
  },

  // Submit profile verification
  async verifyProfile(verificationData: { id_number?: string; license_number?: string }): Promise<User> {
    const response = await client.post<APIResponse<User>>('/api/auth/profile/verify', verificationData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to submit verification details');
    }
    return response.data.data;
  },

  // Fetch reviews for a specific lab
  async getLabReviews(labId: string): Promise<Review[]> {
    const response = await client.get<APIResponse<Review[]>>(`/api/labs/${labId}/reviews`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch lab reviews');
    }
    return response.data.data;
  },

  // Submit a review for a specific lab
  async submitLabReview(labId: string, rating: number, reviewerName: string, comment: string): Promise<Review> {
    const response = await client.post<APIResponse<Review>>(`/api/labs/${labId}/reviews`, { rating, reviewer_name: reviewerName, comment });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to submit lab review');
    }
    return response.data.data;
  },

  // Geocode address query via backend proxy
  async geocode(query: string): Promise<any[]> {
    const response = await client.get<APIResponse<any[]>>('/api/geocode', { params: { q: query } });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to geocode address');
    }
    return response.data.data;
  },
};
