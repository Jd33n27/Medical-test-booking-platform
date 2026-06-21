# Medical Test Booking Platform - Master Plan
**Project:** Test Booking Platform for Nigeria  
**Owner:** Jaydeen  
**Timeline:** 4-day MVP + 2-week Phase 2  
**Budget:** Zero (all free tiers)  
**Status:** Planning

---

## EXECUTIVE SUMMARY

**Problem:** Patients in Nigeria waste time traveling to labs just to book tests, can't compare prices, don't know waiting times.

**Solution:** Simple web app where patients can:
- See available tests from labs (with prices, locations, wait times)
- Book appointments online
- Request home sample collection
- Pay online (Flutterwave)
- Get results via email/SMS

**MVP Success Metric:** 100+ bookings in week 1 from friends + initial user outreach.

---

## PHASE BREAKDOWN

### PHASE 1: MVP (Days 1-4) — Core Booking Loop
**Goal:** Patients can book a test and pay online.

**What ships:**
- Homepage: "List all tests" (hardcoded 5 labs × 3 tests = 15 test offerings)
- Patient flow: Browse → Select test → Pick time slot → Enter details → Pay → Confirmation email
- Admin stub: Simple JSON file listing labs/tests (upgrade to admin panel in Phase 2)
- No auth required (MVP simplicity)

**Not in MVP:**
- Home collection scheduling (Phase 2)
- User accounts / booking history (Phase 2)
- Lab results portal (Phase 2)
- Admin dashboard (Phase 2)

---

### PHASE 2: Scale (Weeks 2-3)
**What adds:**
- User accounts + login (preserve booking history)
- Home sample collection scheduling
- Lab can mark results ready → SMS/email alert
- Basic admin panel to update tests/prices
- Analytics dashboard (bookings/revenue)

---

### PHASE 3: Monetization (Weeks 4+)
**What adds:**
- Revenue split tracking (you + labs)
- Affiliate promotions
- SMS reminders before appointment
- Lab partner onboarding flow (self-serve form)

---

## TECH STACK (ALL FREE)

### Backend
- **Runtime:** Go 1.23+
- **Framework:** Fiber (lightweight, fast)
- **Database:** Supabase (PostgreSQL free tier: 500MB, 2 simultaneous connections)
- **Hosting:** Render.com (free tier: sleeps after 15min inactivity, wakes on request)
- **Email:** Brevo (300 free emails/day)
- **Payments:** Flutterwave (Nigeria-based, free to integrate, you get paid to your bank account)

### Frontend
- **Framework:** React 19 + TypeScript
- **Build:** Vite
- **Hosting:** Vercel (free tier: automatic deploys on git push)
- **Styling:** Tailwind CSS
- **HTTP Client:** axios

### DevOps
- **Git:** GitHub (free)
- **Environment:** .env files (gitignore secrets)
- **Database migrations:** Simple SQL scripts in `/scripts` folder

---

## DATABASE SCHEMA (PostgreSQL/Supabase)

```sql
-- LABS TABLE
CREATE TABLE labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  latitude FLOAT,
  longitude FLOAT,
  accepts_home_collection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TESTS TABLE
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  description TEXT,
  price_naira DECIMAL(10,2) NOT NULL,
  turnaround_hours INT DEFAULT 24,
  sample_type TEXT, -- "Blood", "Urine", "Saliva", etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- TIME SLOTS TABLE
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  capacity INT DEFAULT 10,
  booked INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lab_id, slot_date, slot_time)
);

-- BOOKINGS TABLE
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id),
  time_slot_id UUID REFERENCES time_slots(id),
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  home_collection BOOLEAN DEFAULT FALSE,
  collection_address TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  flutterwave_ref TEXT UNIQUE,
  total_price_naira DECIMAL(10,2),
  result_ready BOOLEAN DEFAULT FALSE,
  result_file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for speed
CREATE INDEX idx_bookings_email ON bookings(patient_email);
CREATE INDEX idx_bookings_payment ON bookings(payment_status);
CREATE INDEX idx_time_slots_lab ON time_slots(lab_id, slot_date);
```

---

## API CONTRACTS

### Base URL
**Production:** `https://testbooking-api.onrender.com`  
**Local Dev:** `http://localhost:5000`

### Response Format
All responses are JSON. Timestamps in ISO 8601.

```json
{
  "success": true,
  "data": { /* payload */ },
  "error": null,
  "timestamp": "2025-06-20T10:30:00Z"
}
```

### ENDPOINTS

#### 1. GET /api/labs
**Purpose:** Fetch all labs (for homepage filters)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Genesis Diagnostics",
      "address": "123 Broad Street",
      "city": "Lagos",
      "state": "Lagos",
      "accepts_home_collection": true
    }
  ]
}
```

---

#### 2. GET /api/tests?lab_id=:id
**Purpose:** Fetch all tests for a lab, or all tests if no lab_id

**Query Params:**
- `lab_id` (optional): UUID of lab
- `search` (optional): Test name search keyword

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "lab_id": "550e8400-e29b-41d4-a716-446655440000",
      "test_name": "Full Blood Count",
      "description": "Counts all blood cell types",
      "price_naira": 5500,
      "turnaround_hours": 24,
      "sample_type": "Blood",
      "lab_name": "Genesis Diagnostics"
    }
  ]
}
```

---

#### 3. GET /api/tests/:test_id/slots
**Purpose:** Fetch available time slots for a test (next 7 days)

**Response:**
```json
{
  "success": true,
  "data": {
    "test_id": "660e8400-e29b-41d4-a716-446655440001",
    "lab_id": "550e8400-e29b-41d4-a716-446655440000",
    "slots": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "date": "2025-06-21",
        "time": "09:00",
        "available": 8,
        "label": "Saturday 9:00 AM (8 slots left)"
      }
    ]
  }
}
```

---

#### 4. POST /api/bookings
**Purpose:** Create a new booking (patient provides details, returns Flutterwave payment link)

**Request:**
```json
{
  "test_id": "660e8400-e29b-41d4-a716-446655440001",
  "time_slot_id": "770e8400-e29b-41d4-a716-446655440002",
  "patient_name": "Adeyemi Okafor",
  "patient_email": "adeyemi@example.com",
  "patient_phone": "+2348012345678",
  "home_collection": false,
  "collection_address": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking_id": "880e8400-e29b-41d4-a716-446655440003",
    "flutterwave_link": "https://checkout.flutterwave.com/pay/...",
    "amount": 5500,
    "status": "awaiting_payment"
  }
}
```

---

#### 5. GET /api/bookings/:booking_id/status
**Purpose:** Check booking status (used after payment)

**Response:**
```json
{
  "success": true,
  "data": {
    "booking_id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "paid",
    "appointment_date": "2025-06-21",
    "appointment_time": "09:00",
    "test_name": "Full Blood Count",
    "lab_name": "Genesis Diagnostics",
    "lab_address": "123 Broad Street, Lagos",
    "result_ready": false
  }
}
```

---

#### 6. POST /api/webhooks/flutterwave
**Purpose:** Receive payment confirmation from Flutterwave (internal use, ignore on frontend)

---

## PROJECT FILE STRUCTURE

```
test-booking-platform/
├── backend/                    # Go + Fiber API
│   ├── main.go
│   ├── go.mod
│   ├── go.sum
│   ├── .env.example
│   ├── handlers/
│   │   ├── labs.go
│   │   ├── tests.go
│   │   ├── bookings.go
│   │   └── webhooks.go
│   ├── models/
│   │   ├── lab.go
│   │   ├── test.go
│   │   ├── booking.go
│   │   └── time_slot.go
│   ├── services/
│   │   ├── flutterwave.go      # Payment processing
│   │   ├── email.go            # Brevo integration
│   │   └── slot_management.go
│   ├── db/
│   │   ├── db.go               # Supabase connection
│   │   └── migrations.sql      # Schema + seed data
│   ├── middleware/
│   │   └── cors.go
│   ├── config/
│   │   └── config.go
│   └── Dockerfile
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── LabList.tsx
│   │   │   ├── TestList.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   ├── PaymentRedirect.tsx
│   │   │   └── ConfirmationPage.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── BookingPage.tsx
│   │   │   └── SuccessPage.tsx
│   │   ├── api/
│   │   │   └── client.ts       # axios instance + endpoints
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   ├── utils/
│   │   │   └── formatters.ts   # Price, date formatters
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── .env.example
│   └── package.json
│
├── scripts/
│   ├── seed_labs.sql           # Insert seed data
│   └── deploy.sh               # Quick deploy script
│
├── docs/
│   ├── API.md                  # Full API reference
│   └── DEPLOYMENT.md           # Step-by-step deploy guide
│
└── README.md
```

---

## SEED DATA (HARDCODED FOR MVP)

5 example labs × 3 example tests = 15 test offerings.

**Labs:**
1. Genesis Diagnostics (Lagos, Mainland)
2. Citywide Pathology (Lagos, Island)
3. Trusted Medical Lab (Abuja)
4. HealthFirst Diagnostics (Ibadan)
5. Central Lab Services (Port Harcourt)

**Tests (same 3 for each lab):**
1. Full Blood Count (₦5,500 | 24hr | Blood)
2. Lipid Profile (₦8,000 | 24hr | Blood)
3. Typhoid Test (₦4,500 | 2hr | Blood)

**Time Slots:** Generated for next 7 days, 3 slots per day (9 AM, 12 PM, 3 PM), 10 capacity each.

---

## DEPLOYMENT CHECKLIST

- [ ] Render: Deploy backend Go app
- [ ] Supabase: Create project, run migrations
- [ ] Vercel: Deploy frontend (auto-deploys from GitHub)
- [ ] Flutterwave: Set up sandbox account, get API key
- [ ] Brevo: Sign up, create transactional email template
- [ ] Environment variables: Set on Render + Vercel
- [ ] Test full flow: Browse → Book → Pay → Email confirmation
- [ ] Share live link with 10 friends (beta testers)

---

## PHASE 1 AGENT PROMPTS (Days 1-4)

### Day 1: Backend Foundation
**Your job:** Build the Go API skeleton + database setup. Output: Working API running on localhost:5000, with /api/labs and /api/tests returning hardcoded data.

### Day 2: Frontend UI
**Your job:** Build React homepage + test/booking flow. Output: Pretty, mobile-friendly UI that calls the backend API and displays tests/labs.

### Day 3: Booking + Payment
**Your job:** Connect Flutterwave payment flow + email confirmations. Output: User can book a test, get sent to Flutterwave, and receive confirmation email after payment.

### Day 4: Testing + Deploy
**Your job:** Test full flow end-to-end, fix bugs, deploy to Render + Vercel. Output: Live URL you can share.

---

## INCOME PROJECTION (Post-MVP)

**Assumption:** 20% commission on test bookings.
- 100 bookings/week → ₦28,000/week → ₦112,000/month
- 500 bookings/week → ₦140,000/week → ₦560,000/month

At ₦560K/month, you can:
- Upgrade from Render free to $12/month (faster, no sleep)
- Add Twilio SMS for ₦50K/month
- Hire 1 support person part-time

---

## SUCCESS CRITERIA

**Week 1 (MVP Live):**
- [ ] 0 downtime deployment
- [ ] 100+ bookings
- [ ] All payments clear to your bank
- [ ] <500ms response times

**Week 2-3 (Phase 2):**
- [ ] User accounts + booking history working
- [ ] Home collection bookings enabled
- [ ] Lab partner onboarding (5 real labs signed up)

**Month 1:**
- [ ] 500+ cumulative bookings
- [ ] ₦100K+ revenue (before commission to labs)
- [ ] <2% payment failure rate

---

## KNOWN RISKS

1. **Supabase free tier:** 500MB limit, 2 concurrent connections. Bottleneck if 100+ concurrent users. Solution: Upgrade to paid ($5/month) or optimize queries.
2. **Render sleep:** Backend goes dormant after 15min. First request takes 5-10sec. Solution: Use Vercel serverless functions for API (Phase 2).
3. **Payment reconciliation:** Flutterwave webhook might fail. Solution: Implement webhook retry + manual check endpoint.
4. **Medical liability:** You're intermediary for real medical tests. Get legal review (Nigeria Health Insurance Authority? FIRS?). For MVP, T&Cs clear you're not liable.

---

## NEXT STEPS

1. **Read the Agent Prompts below** (one per day)
2. **Spin up Supabase project** (5 min, get connection string)
3. **Create GitHub repo**, push empty Go + React scaffolds
4. **Day 1 morning:** Give agent the Day 1 prompt, watch it build
5. **Share this master plan** in future chats: "Ref: Test Booking MVP, Phase 1, Day X"

---

---

# DETAILED AGENT PROMPTS (Copy-paste one per day)

## DAY 1 PROMPT: Backend Foundation

```
You are building the backend API for a medical test booking platform in Nigeria.

GOAL: By end of day, have a working Go API on localhost:5000 that serves hardcoded test/lab data.

ARCHITECTURE:
- Framework: Fiber (Go)
- Database: Supabase PostgreSQL
- Payments: Flutterwave (integrate stub for Day 3)

MUST DO (in order):
1. Init Go project: go mod init testbooking-api
2. Install dependencies: go get github.com/gofiber/fiber/v3, github.com/lib/pq, github.com/joho/godotenv
3. Create main.go with Fiber server (port 5000)
4. Create .env.example with: DATABASE_URL, FLUTTERWAVE_KEY, BREVO_KEY, PORT=5000
5. Create /db/db.go to connect to Supabase PostgreSQL (use DATABASE_URL from .env)
6. Run migration: copy-paste the SQL schema from the master plan into /db/migrations.sql
7. Create seed function in /db/db.go that inserts the 5 hardcoded labs + 3 tests per lab + time slots (next 7 days)
8. Create /models/ with Go structs: Lab, Test, TimeSlot, Booking
9. Create /handlers/labs.go with GET /api/labs (return all labs from DB)
10. Create /handlers/tests.go with GET /api/tests (return all tests, optional lab_id filter) + GET /api/tests/:id/slots
11. Add CORS middleware to allow frontend requests
12. Test locally: curl http://localhost:5000/api/labs — should return JSON array of labs

OUTPUT CHECKLIST:
- [ ] go run main.go starts without errors
- [ ] curl http://localhost:5000/api/labs returns 5 labs (JSON)
- [ ] curl http://localhost:5000/api/tests returns 15 tests with lab names
- [ ] curl http://localhost:5000/api/tests/[test-id]/slots returns 21 slots (7 days × 3 times)
- [ ] .env file is gitignored, .env.example is committed

NOTES:
- Don't worry about auth yet. No user login for MVP.
- Use simple in-memory UUID generation for IDs (Go's github.com/google/uuid).
- Seed data runs once on app startup (idempotent: check if data exists before inserting).
- Keep handlers simple: query DB, return JSON. No fancy business logic yet.
- Errors: return {success: false, error: "message"} JSON. Set HTTP 400 or 500.
```

---

## DAY 2 PROMPT: Frontend UI

```
You are building the React frontend for the medical test booking platform.

GOAL: By end of day, have a beautiful, mobile-friendly UI that lets users browse labs/tests and see booking form (no payment yet).

TECH:
- Framework: React 19 + TypeScript
- Build: Vite
- Styling: Tailwind CSS
- HTTP: axios
- Backend: http://localhost:5000 (in dev), https://testbooking-api.onrender.com (in prod)

MUST DO (in order):
1. Create React + Vite project: npm create vite@latest frontend -- --template react-ts
2. Install: npm install axios tailwindcss -D
3. Init Tailwind: npx tailwindcss init -p
4. Create /src/api/client.ts: axios instance with base URL (check .env or hardcode localhost for dev)
5. Create /src/types/index.ts with TypeScript interfaces: Lab, Test, TimeSlot, Booking
6. Create /src/pages/HomePage.tsx:
   - Fetch /api/labs on mount, display as filter buttons (Genesis, Citywide, etc.)
   - Below: Fetch /api/tests (no lab_id filter yet), display as cards in grid (test name, price in ₦, sample type)
   - Add search box to filter tests by name
   - Click a test card → navigate to BookingPage
7. Create /src/pages/BookingPage.tsx:
   - Show test details (name, price, turnaround time)
   - Fetch /api/tests/:id/slots, display as date/time buttons (next 7 days)
   - User picks a slot → show BookingForm
   - BookingForm component: inputs for name, email, phone, checkbox for home collection
   - If home_collection checked, show address input
   - Button "Review Booking" → ConfirmationPage
8. Create /src/pages/ConfirmationPage.tsx:
   - Show booking summary: test name, date/time, lab, total price
   - Button "Proceed to Payment" (don't implement payment yet, just stub it: alert("Coming next!"))
9. Create /src/App.tsx with Router (React Router v7 or simple useState for page state)
10. Style with Tailwind: dark header, white cards, green "Book Now" buttons, mobile-first responsive
11. Add loading spinners on API calls (simple CSS spinner or Icon)

OUTPUT CHECKLIST:
- [ ] npm run dev works, loads on http://localhost:5173
- [ ] Click on a test → navigate to BookingPage
- [ ] BookingPage fetches slots, displays them clickable
- [ ] Fill booking form, see confirmation page
- [ ] All text is clear in Nigeria English (NG locale for numbers: "₦5,500")
- [ ] Looks good on mobile (375px width) and desktop

DESIGN NOTES:
- Color scheme: Green (#10b981) for primary, blue (#3b82f6) for secondary, gray for neutral
- Typography: Use Tailwind defaults, max-width 1200px
- Images: Don't add yet, MVP is text-only
- Logo: Simple text "MedBook" top-left
- Header: MedBook | Search | Contact
- Feel: Clean, minimal, Nigerian healthcare vibes (professional but approachable)

ACCESSIBILITY:
- Use semantic HTML (button, form, nav)
- Add alt text for any icons
- Ensure color contrast 4.5:1 for text
```

---

## DAY 3 PROMPT: Booking + Payment + Email

```
You are connecting Flutterwave payments and email confirmations to the booking platform.

GOAL: By end of day, user can book a test, pay via Flutterwave, and get a confirmation email. Booking is saved to DB with status "paid".

BACKEND CHANGES:
1. Create /services/flutterwave.go:
   - Function InitiatePayment(amount naira, booking_id, email) returns Flutterwave checkout link
   - Use Flutterwave sandbox API for testing (API key from .env)
   - POST to https://api.flutterwave.co/v3/payments
   - Include redirect URL: https://yourfrontend.com/payment-success?booking_id=:booking_id
2. Create /handlers/bookings.go with POST /api/bookings:
   - Accept JSON: {test_id, time_slot_id, patient_name, patient_email, patient_phone, home_collection, collection_address}
   - Validate inputs (name not empty, email valid, phone valid)
   - Fetch test details (price) from DB
   - Create booking record in DB with status "pending"
   - Call InitiatePayment, get checkout link
   - Return {booking_id, flutterwave_link, amount, status}
   - Decrement time slot capacity (booked++)
3. Create /handlers/webhooks.go with POST /api/webhooks/flutterwave:
   - Receive Flutterwave webhook when user completes payment
   - Verify webhook signature (Flutterwave sends hash)
   - Update booking status to "paid" if payment succeeded
   - Call SendConfirmationEmail (see below)
4. Create /services/email.go:
   - Function SendConfirmationEmail(booking, test, lab details) using Brevo API
   - Email template: "Your test booking confirmed | Appointment on [date] [time] | Lab: [lab name] | Address: [lab address]"
   - Use Brevo free tier (300 emails/day)
   - POST to https://api.brevo.com/v3/smtp/email

FRONTEND CHANGES:
1. Update ConfirmationPage.tsx:
   - POST to /api/bookings with form data
   - Get back flutterwave_link
   - Show "Processing payment..." then redirect to flutterwave_link (window.location = ...)
2. Create /src/pages/PaymentSuccessPage.tsx:
   - User redirected here after Flutterwave payment
   - Read booking_id from URL query params
   - Call GET /api/bookings/:booking_id/status
   - Show "Payment successful! Check your email for confirmation."
   - Button: "View my bookings" (stub for now) or "Book another test"
3. Create /src/pages/PaymentFailedPage.tsx:
   - Fallback if payment fails
   - Show "Payment failed. Your booking is cancelled. Try again?" with link to re-book

INTEGRATION CHECKLIST:
- [ ] Backend can POST /api/bookings, returns flutterwave_link
- [ ] Backend can receive Flutterwave webhook (test with curl or Flutterwave dashboard simulator)
- [ ] Booking status updates to "paid" after webhook
- [ ] Email sent to patient with appointment details
- [ ] Frontend redirects to Flutterwave, then to success page
- [ ] Database: booking table now has filled payment_status + flutterwave_ref
- [ ] Error handling: Show user-friendly error if payment fails or email bounces

FLUTTERWAVE SETUP:
- Sign up at https://flutterwave.com (free sandbox account)
- Get sandbox API key from dashboard
- Add to .env: FLUTTERWAVE_KEY=...
- Test payment: Use Flutterwave's test card (4242 4242 4242 4242, any future date, any CVV)

BREVO SETUP:
- Sign up at https://brevo.com (free tier: 300 emails/day)
- Create API key in settings
- Add to .env: BREVO_KEY=...
- Create email template in dashboard, use template ID in code

TESTS:
- Manually: Fill booking form, click "Proceed to Payment" → should redirect to Flutterwave
- Use test card → complete payment → you should get confirmation email
- Check booking in DB: status should be "paid", flutterwave_ref populated
```

---

## DAY 4 PROMPT: Testing + Deployment

```
You are finalizing and deploying the medical test booking platform to production.

GOAL: By end of day, app is live on real URLs (Vercel for frontend, Render for backend). Users can book tests and pay from the live site.

DEPLOYMENT STEPS:

BACKEND (Render):
1. Push code to GitHub repo (github.com/yourusername/testbooking-api)
2. Go to https://render.com, sign in with GitHub
3. Create new "Web Service" from GitHub repo
4. Settings:
   - Build command: go build -o api
   - Start command: ./api
   - Environment variables: add DATABASE_URL, FLUTTERWAVE_KEY, BREVO_KEY from .env
5. Deploy (takes 2-3 min)
6. Copy production URL: https://testbooking-api.onrender.com
7. Test: curl https://testbooking-api.onrender.com/api/labs (should return labs)

FRONTEND (Vercel):
1. Update /frontend/.env.production: API_BASE_URL=https://testbooking-api.onrender.com
2. Update /frontend/src/api/client.ts to use API_BASE_URL
3. Commit to GitHub
4. Go to https://vercel.com, sign in with GitHub
5. Click "New Project", select testbooking-platform repo
6. Select "frontend" folder as root directory
7. Add environment variables: VITE_API_URL=https://testbooking-api.onrender.com
8. Deploy (auto-deploys on git push)
9. Copy production URL: https://testbooking-platform.vercel.app (or your custom domain)

FLUTTERWAVE LIVE MODE (Optional for MVP, use sandbox for testing):
- Create production Flutterwave account
- Get production API key (different from sandbox)
- Update .env on Render: use production key
- Users see "Pay with real money" (or use sandbox for closed beta)

DATABASE BACKUP:
- Supabase auto-backs up, but manually export schema:
  - pg_dump $DATABASE_URL > backup.sql
  - Commit to git (gitignore passwords in connection string)

FINAL TESTING (Live Site):
1. Open https://testbooking-platform.vercel.app
2. Browse labs and tests
3. Book a test with real email (yours)
4. Proceed to Flutterwave (sandbox)
5. Enter test card (4242 4242 4242 4242)
6. Complete payment → should see success page
7. Check email inbox → should have confirmation email
8. Check Render logs: https://dashboard.render.com → logs should show no errors
9. Check Supabase dashboard: new booking in bookings table with status "paid"

MONITORING:
- Render free tier: backend sleeps after 15 min inactivity (slow first request)
- Monitor: uptime dashboard, error logs on Render
- DB: check Supabase disk usage (free tier: 500MB)

BUG FIXES (Common issues):
- CORS error? Update Fiber CORS to allow vercel.app domain
- 404 on API calls? Check Render URL, DATABASE_URL not set
- Email not sending? Check Brevo API key, email template ID
- Payment webhook not firing? Check Flutterwave webhook settings (add your Render URL)

SHARE WITH USERS:
- Post live link: "Test booking platform live! Book medical tests from your phone. Link: [vercel URL]"
- Invite 10-20 friends to test
- Ask for feedback: bugs, confusing flows, slow pages
- Track: bookings per day, payment success rate, emails sent/bounced

SUCCESS METRICS (Monitor for Week 1):
- [ ] 0 downtime (Render doesn't crash)
- [ ] <2s page load time (Vercel + Render from Lagos ISP)
- [ ] 100+ bookings (ask friends to test)
- [ ] 98%+ payment success (no Flutterwave errors)
- [ ] 95%+ emails delivered (Brevo bounce rate <5%)

If everything passes: MVP is done! Move to Phase 2 (user accounts, home collection, results portal).
```

---

END OF MASTER PLAN
```