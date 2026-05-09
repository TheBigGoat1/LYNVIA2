# Firestore security hardening (Lynvia)

Client writes for **sensitive payroll paths** are now expected to go through **Next.js API routes** (Firebase Admin SDK):

- `POST /api/business/company-employees` — create employee  
- `PATCH /api/business/company-employees/[employeeId]` — update employee  
- `POST /api/business/monthly-payroll-submissions` — monthly payroll estimation payload  
- `PUT /api/business/company-rates` — employer contribution rates under `companies/{companyId}/settings/rates`

## Recommended rules (merge with your existing `firestore.rules`)

**Goal:** members of a company can **read** payroll/employee data; **only Admin SDK** (or Cloud Functions) should **write** `employees`, `monthlyPayroll`, and `settings` so browsers cannot bypass the API.

Prerequisites:

- Each authenticated user document at `users/{uid}` contains `companyId` matching their employer (already used by the app).
- Custom claim `role: 'admin'` exists for Lynvia admins (already used in parts of the app).

Example snippets (adapt paths / roles to your production rules file):

```txt
function signedIn() {
  return request.auth != null;
}

function userCompanyId() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId;
}

function isCompanyMember(companyId) {
  return signedIn() && userCompanyId() == companyId;
}

function isAdmin() {
  return signedIn() && request.auth.token.role == 'admin';
}

match /companies/{companyId} {
  allow read: if isCompanyMember(companyId) || isAdmin();
  allow create, update, delete: if isAdmin();

  match /employees/{employeeId} {
    allow read: if isCompanyMember(companyId) || isAdmin();
    allow write: if false;
  }

  match /monthlyPayroll/{monthId} {
    allow read: if isCompanyMember(companyId) || isAdmin();
    allow write: if false;
  }

  match /settings/{docId} {
    allow read: if isCompanyMember(companyId) || isAdmin();
    allow write: if false;
  }
}
```

> **Important:** Deploying the `allow write: if false` blocks without migrating **all** other company subcollections (e.g. `comm_threads`, `leave_requests`, `cfo_summaries`) can break features. Either add explicit rules per subcollection or keep a temporary permissive fallback while you migrate each write path to the API.

Deploy:

```bash
firebase deploy --only firestore:rules
```

## Operational note

Until rules deny client writes, the **API remains the authoritative enforcement** layer (validation + CLA checks + server-side gross recomputation for payroll).
