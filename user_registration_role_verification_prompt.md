# Prompt: User Registration, Role Selection & Administrator Approval Workflow

Copy and paste the prompt below into an AI agent or development task list to implement the User Registration, Role Verification, and Administrator Approval flow for your Web Application.

---

```markdown
# Task: User Registration and Role Verification Flow with Administrator Approval

## Objective
Implement a complete user onboarding and role verification workflow where newly registered users must select a system role upon sign-up and wait for administrator approval before gaining access to protected system features.

---

## Technical & Functional Requirements

### 1. User Registration & Role Selection Redirect
- After a user signs up for the first time, immediately sync their record and redirect them to a **Role Selection** page (`/select-role`).
- If a user attempts to navigate away before choosing a role, enforce redirection back to the **Role Selection** page.

### 2. Role Selection Page (`/select-role`)
- Display a clean, responsive UI presenting available system roles (e.g., **Student**, **Lecturer**, **Department Head**, **Administrator**).
- Each role option should display:
  - Role Title & Icon
  - Short description of capabilities and permissions associated with the role
  - Selection radio card indicator
- Include a **Submit Role Request** button that:
  1. Saves the selected role to the user's account in the database.
  2. Sets the account status to `Pending Approval` (`PENDING`).
  3. Sets `roleSelected` to `true`.
  4. Redirects the user to the **Registration Successful / Pending Approval** page (`/pending-approval`).

### 3. Registration Successful & Pending Approval Page (`/pending-approval`)
- Render a dedicated success page informing the user of their account state:
  > **Registration Successful!**
  >
  > Your account has been created successfully, and your role request has been submitted.
  >
  > Your account is currently pending administrator approval. You will gain full access to the system once an administrator reviews and approves your account.
  >
  > Please wait for approval before attempting to use the system.

- **Page Elements**:
  - Success / Pending verification illustration or icon.
  - User details badge displaying their name, email, and requested system role.
  - **Refresh Status** button: Queries the backend to check if an administrator has approved or rejected the account. If approved (`status === "APPROVED"` or `"ACTIVE"`), automatically redirect the user to `/dashboard`.
  - **Return to Login / Sign Out** button: Safely logs out the user and returns to the sign-in page.

### 4. Login Restrictions & Route Protection
- **Authenticated Route Guard (`RequireApproved`)**:
  - Intercept all protected application routes.
  - Check the authenticated user's `status`:
    - `APPROVED` / `ACTIVE`: Grant full access to system features based on assigned role.
    - `PENDING`:
      - If `roleSelected === false`: Redirect to `/select-role`.
      - If `roleSelected === true`: Redirect to `/pending-approval`.
    - `REJECTED`: Redirect to `/account-rejected` displaying the rejection message and optional reason provided by the administrator.
- **Backend Middleware (`enforceStatus`)**:
  - Whitelist endpoints `/api/v1/users/me`, `/api/v1/users/me/select-role`, `/api/v1/users/sync`, and `/api/v1/users/me/activate`.
  - For all other protected API routes, return HTTP status `403 Forbidden` with code `ACCOUNT_PENDING_APPROVAL` if status is `PENDING`, or `ACCOUNT_REJECTED` if status is `REJECTED`.

### 5. Administrator Governance Panel
- In the Admin Panel / User Management section:
  - Add a **Pending Approvals** tab/filter and a prominent badge highlighting the count of accounts awaiting review.
  - Display user name, email, submission timestamp, and requested role for each pending request.
  - **Approve Action**:
    - Opens a modal allowing the administrator to review and optionally reassign the user's role before approving.
    - Updates user status from `PENDING` to `APPROVED`, sets `approvedBy` and `approvedAt` audit fields.
  - **Reject Action**:
    - Opens a modal prompting for an optional rejection reason.
    - Updates user status to `REJECTED`, sets `rejectedBy`, `rejectedAt`, and `rejectionReason` fields.

---

## Database Model Schema

Ensure the User entity schema contains the following fields:

```text
id               : String / ObjectId (Primary Key)
clerkId / authId : String (Unique Index)
email            : String (Unique Index)
fullName         : String
role             : Enum ('student', 'lecturer', 'dept_head', 'admin')
status           : Enum ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'ALUMNI', 'ARCHIVED') [Default: 'PENDING']
roleSelected     : Boolean [Default: false]
approvedBy       : ObjectId (Ref User)
approvedAt       : Date
rejectedBy       : ObjectId (Ref User)
rejectedAt       : Date
rejectionReason  : String
createdAt        : Date
updatedAt        : Date
```

---

## Expected User Flow Diagram

```text
Sign Up (Authentication Provider / Form)
                  │
                  ▼
         Select Role (/select-role)
                  │
                  ▼
  Submit Role (Save Role, Status = PENDING, RoleSelected = true)
                  │
                  ▼
Registration Successful / Pending Approval Page (/pending-approval)
                  │
                  ├── Wait for Administrator Review
                  │
                  ▼
     Administrator Approves Account (Status = APPROVED)
                  │
                  ▼
User Gains Full Access to System Features (/dashboard)
```
```
