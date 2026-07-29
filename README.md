# NELMS — Njala E-Learning Management System

NELMS is a lightweight, high-performance, mobile-optimized 3-tier E-Learning platform built for Njala University. Designed specifically for low-bandwidth environments (3G-equivalent performance), it reproduces 22 UI screens across 4 distinct user roles (Student, Lecturer, Department Head, Administrator).

---

## 🏗 System Architecture

```
                                  ┌────────────────────────┐
                                  │      Clerk Auth        │
                                  └───────────┬────────────┘
                                              │ JWT Token
                                              ▼
┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────────────────┐
│  Client (Vite+React PWA)├─────────►│     Server (Express 5)  ├─────────►│      MongoDB Atlas      │
│  Tailwind v4 / AppLayout│  REST    │  requireAuth & Zod Val  │  Mongoose│  10 Collections + Audit │
└─────────────────────────┘          └────────────┬────────────┘          └─────────────────────────┘
                                                  │
                                                  │ Multipart File Uploads
                                                  ▼
                                     ┌─────────────────────────┐
                                     │     Cloudinary Storage  │
                                     └─────────────────────────┘
```

---

## 🛠 Technology Stack & Hardening

### Client Side
- **Framework**: Vite 8 + React 19
- **Styling**: Tailwind CSS v4 (configured with full `@theme` token set matching Njala institutional palette)
- **Routing**: React Router v6 (Data Router with `RequireAuth` & `RequireRole` route guards)
- **Auth UI**: `@clerk/clerk-react` (`<ClerkProvider>`, `<SignIn>`, `<SignUp>`)
- **PWA & Offline Resilience**: Service Worker (`sw.js`) + Web App Manifest (`manifest.webmanifest`)
- **Notifications UI**: Interactive bell dropdown with unread badge counter & mark-read triggers

### Server Side
- **Runtime**: Node.js (ES Modules) + Express 5
- **Database**: MongoDB Atlas via Mongoose 9 (10 Collections: `User`, `Course`, `Enrollment`, `Assignment`, `Submission`, `Material`, `Announcement`, `Department`, `Notification`, `AuditLog`)
- **Validation**: `Zod` schema validation middleware (`validateBody`)
- **Security & Rate Limiting**: `express-rate-limit` for auth/upload routes + `helmet` HTTP security headers
- **Audit Logging**: `AuditLog` collection tracking role escalation, grade posting, department modifications
- **Testing**: `Vitest` + `Supertest` integration test suite for RBAC and authorization matrix
- **File Uploads**: Multer memory storage + Cloudinary SDK v2 (`uploadToCloudinary`)

---

## 📁 Repository Structure

```
Njala-E_Learning/
├── client/
│   ├── public/
│   │   ├── manifest.webmanifest   # PWA Web App Manifest
│   │   └── sw.js                  # PWA Service Worker for offline caching
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # AppLayout, Sidebar, TopBar (with unread notification badge)
│   │   │   └── ui/                # NotificationDropdown, CourseCard, DataTable, Modal, StatusBadge, etc.
│   │   ├── hooks/                 # useUser hook (Clerk + MongoDB user sync)
│   │   ├── lib/                   # api.js Axios client
│   │   ├── pages/                 # Role-based pages (Student, Lecturer, Dept Head, Admin)
│   │   ├── index.css              # Tailwind v4 @theme design system
│   │   ├── main.jsx               # ClerkProvider + RouterProvider entry
│   │   └── router.jsx             # Role-based protected routes
│   └── package.json
└── server/
    ├── src/
    │   ├── middleware/            # requireAuth, requireRole, populateUser, validate, rateLimiter
    │   ├── models/                # User, Course, Enrollment, Assignment, Submission, Material, Announcement, Department, Notification, AuditLog
    │   ├── routes/                # REST API routes (including /notifications and /courses/:id/gradebook/export)
    │   ├── scripts/               # digestGenerator.js (scheduled daily notification digest)
    │   ├── tests/                 # auth.test.js (Vitest + Supertest integration suite)
    │   ├── utils/                 # auditLogger.js, schemas.js (Zod schemas)
    │   └── index.js               # Express app entry point
    └── package.json
```

---

## 🔐 Environment Variables Setup

### Client (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Server (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nelms?retryWrites=true&w=majority
CLERK_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_ORIGIN=http://localhost:5173
```

---

## 🚀 Running Locally & Running Tests

### 1. Install Dependencies
```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
```

### 2. Start Development Servers
```bash
# Terminal 1 — Server (runs on http://localhost:4000)
cd server
npm run dev

# Terminal 2 — Client (runs on http://localhost:5173)
cd client
npm run dev
```

### 3. Run Authorization & Integration Tests
```bash
cd server
npm test
```

### 4. Run Scheduled Daily Digest Generator
```bash
cd server
node src/scripts/digestGenerator.js
```

---

## 📊 Academic Features & Extensions

1. **Academic Gradebook CSV Export**: Lecturers, Department Heads, and Admins can export course gradebooks in standard CSV format via `GET /api/v1/courses/:id/gradebook/export`.
2. **Late Submission Detection**: Submissions submitted after an assignment's `dueDate` are automatically flagged with `isLate` and `daysLate` calculation.
3. **Audit Trail**: Sensitive actions (role changes, grading, course modifications) are logged into the `AuditLog` collection.
4. **In-App Notifications**: Real-time events (grade posting, course announcements) generate notifications accessible via the top navigation bar.

---

## 👥 Role-Based Access Control Matrix

| Role | Accessible Routes | Primary Responsibilities |
|---|---|---|
| **Student** | `/dashboard`, `/courses`, `/courses/:id`, `/grades`, `/profile`, submission forms | View enrolled courses, submit assignments, track grades |
| **Lecturer** | `/dashboard`, `/courses`, `/courses/:id/students`, `/assignments/*`, `/materials/*` | Create & manage courses, upload materials, grade submissions, export CSV gradebooks |
| **Dept Head** | `/dashboard`, `/oversight`, `/settings` | Approve draft courses, monitor department metrics |
| **Administrator**| All routes (`/users`, `/departments`, `/analytics`, `/settings`) | Manage user roles, create departments, view platform stats & audit logs |

---

## 📄 License
Academic System Software — Njala University.
