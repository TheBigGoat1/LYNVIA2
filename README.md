# Lynvia Digital

Lynvia Digital is a Swiss legal and financial intelligence platform built with Next.js, Firebase, Stripe, and AI flows...k,.,k,

This guide gives you a complete step-by-step process to:..,k...,6.

1. Start the system locally.
2. Configure required services.,
3. Bootstrap the first admin.
4. Use each role end-to-end (Individual, Business, Accounting Firm, Admin)..

## 1) Prerequisites

Install and verify:

- Node.js 18+ (Node.js 20 recommended)
- npm 9+
- A Firebase project with Firestore/Auth/Storage enabled
- A Stripe account (test mode is recommended first)

## 2) Install Dependencies

From the project root:

```bash
npm install
```

## 3) Environment Setup

Create a local environment file and add all required keys.

Recommended filename:

- .env.local

Required groups:

1. Firebase Client SDK
2. Firebase Admin service account JSON
3. Stripe publishable + secret keys
4. Stripe webhook secret (for local webhook testing)
5. AI provider keys (if you want legal/scenario AI features active)

Important:

- Never commit real secrets.
- Use Stripe test keys for development.
- Keep client-safe keys only in NEXT_PUBLIC_* variables.

## 4) Run the App

Start development server:

```bash
npm run dev
```

Default app URL:

- http://localhost:9002

Optional checks:

```bash
npm run typecheck
npm run lint
```

Production build check:

```bash
npm run build
npm run start
```

## 5) Create the First Admin

Use the bootstrap script to create (or update) a full-access Lynvia admin account:

```bash
npm run admin:create -- --email=admin@lynvia.digital --password="ChangeMe123!" --firstName=Lynvia --lastName=Administrator
```

This grants:

- role: admin custom claim
- full admin panel access
- user and access management permissions
- client document request permission
- notification and document sending permissions
- active admin profile in users/{uid}

If the user already exists, the script updates claims/profile and optional password.

## 6) Stripe Setup (Recommended Before User Testing)

Use Stripe test mode first.

Step-by-step:

1. Put test keys in environment variables.
2. Start app with npm run dev.
3. Run Stripe CLI webhook forwarder to your local webhook route.
4. Set STRIPE_WEBHOOK_SECRET from Stripe CLI output.
5. Complete a test checkout.
6. Confirm subscription/order updates in Firestore.

Notes:

- Accounting Firm subscriptions and Individual checkout both depend on working webhook processing.
- If checkout fails, validate Firebase Admin initialization and Stripe keys first.

## 7) Role-Based Usage: Complete Step-by-Step

### A) Admin Workflow

Use this first to prepare your tenant data.

1. Sign in with the bootstrap admin account.
2. Open Admin Dashboard.
3. Create companies and/or accounting firms.
4. Create users for each role (individual, business, accounting_firm, admin).
5. Assign companyId where applicable.
6. Review pending approvals in Document Approvals.
7. Upload/index legal sources in Legal Database.
8. Monitor platform/system events in System Logs.

Outcome: your environment is ready for business and client users.

### B) Individual User Workflow

1. Register an individual account.
2. Complete profile if prompted.
3. Open dashboard and verify:
	- legal assistant access
	- document generator access
	- scenario calculator access
4. Create legal documents and save drafts.
5. Run scenario calculator for tax/allowance comparisons.
6. Purchase services from Purchase Services / Tax Services.
7. Track progress in My Documents, My Orders, Notifications.
8. Use Deadlines page to track personal due dates and follow-ups.

Outcome: end-to-end consumer journey from questions to documents to paid services.

### C) Business (Company) Workflow

1. Sign in as business admin.
2. Open Employee Management:
	- create employee records
	- link users to company data
3. Open Payroll Processing:
	- upload/process payroll
	- run monthly payroll cycle
4. Open Leave Management:
	- review pending leave requests
	- approve/reject with status tracking
5. Open Financial Scenarios and Virtual CFO for planning insights.
6. Publish internal updates from Announcements.
7. Use Document Center / Document Generator for company templates and approval flow.

Outcome: complete operational workflow for HR, payroll, leave, and internal communication.

### D) Accounting Firm Workflow

1. Sign in as accounting firm admin.
2. Purchase/activate subscription plan from Purchase Services.
3. Open Client Portfolio to manage multiple client companies.
4. Use Client Documents for cross-client document handling.
5. Use Scenario Analysis per client for financial recommendations.
6. Run Document Generator for accounting-firm/client outputs.
7. Track activity in Audit Logs.
8. Manage plan through Billing/portal flows.

Outcome: multi-client advisory and compliance workflow in one account.

## 8) Data & Audit Expectations

Typical collections used by workflows include:

- users
- companies
- users/{uid}/documents
- users/{uid}/orders
- users/{uid}/notifications
- users/{uid}/scenarios
- companies/{companyId}/employees
- companies/{companyId}/leave_requests
- companies/{companyId}/payroll_runs
- system_logs

Use Admin System Logs and role-specific dashboards to verify expected writes during testing.

## 9) Recommended End-to-End Test Plan

Run this sequence before go-live:

1. Admin bootstrap and sign in.
2. Create one business company and one accounting firm.
3. Create users for all roles.
4. Business user:
	- add employees
	- run payroll
	- submit/approve leave
	- publish announcement
5. Individual user:
	- create document
	- run scenario
	- place test purchase
	- add a deadline
6. Accounting firm user:
	- activate subscription in test mode
	- manage at least one client
	- run scenario analysis
7. Admin verifies approvals and logs.
8. Validate Stripe webhook events and Firestore subscription/order updates.

## 10) Troubleshooting Quick Guide

If payment does not start:

1. Verify STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
2. Verify webhook secret and listener.
3. Verify Firebase Admin service account JSON parsing.

If user role routing fails:

1. Check Firebase custom claims.
2. Check users/{uid}.role and users/{uid}.status.
3. Re-login after claim changes.

If dashboards look empty:

1. Confirm companyId links on users.
2. Confirm expected collections are being written.
3. Check Firestore security rules for read access.

## 11) Useful Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
npm run admin:create -- --email=admin@lynvia.digital --password="v" --firstName=Lynvia --lastName=Administrator
```
