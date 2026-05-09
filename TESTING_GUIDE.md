# Lynvia Platform — Testing Guide for New Users

## 📍 How to Access the Application
Open your browser and go to: **http://localhost:3000**

---

## 🔐 User Types & Login

The Lynvia platform has **4 types of users**. Each has different permissions:

| User Type | Description | What They Can Do |
|-----------|-------------|------------------|
| **Admin (Lynvia)** | Platform operator | Manage all clients, approve documents, send requests |
| **Business** | Company client | Manage employees, generate documents, view financial analysis |
| **Accounting Firm** | Fiduciary client | Manage multiple client companies on their behalf |
| **Individual** | Personal/private client | Generate personal legal documents, view scenarios |

---

## 🧪 TESTING EACH FEATURE

---

### 1. COLLECTIVE LABOUR AGREEMENTS (CLA/CCT)

#### What is a CLA?
A CLA (Convention Collective de Travail) is a Swiss labour agreement that sets minimum wages, notice periods, and working conditions for specific industries.

#### How to Test:

**Test 1: Auto-Selection when Creating a Business (Admin Panel)**
1. Go to: `http://localhost:3000/en/admin/company-management`
2. Click the **"Create Business"** button (blue button with + icon, top right)
3. A dialog/form opens. Fill in:
   - Company Name: `Restaurant du Lac SA`
   - Admin First Name: `Pierre`
   - Admin Last Name: `Dupont`
   - Admin Email: `pierre@restaurantdulac.ch`
   - Password: `Test123!`
   - Phone: `+41 21 123 45 67`
   - Canton: Select any (e.g., Vaud)
4. **Important field:** Find the **"Industry"** dropdown and select an industry:
   - `Hôtellerie-restauration` (hotels/restaurants)
   - `Construction` 
   - `Commerce de détail` (retail)
5. **Expected Result:** A box appears showing:
   ```
   ✓ Auto-selected CLA: CCNT Hôtellerie-restauration
     Minimum monthly wage reference: CHF 3,477
   ```
   
**Alternative: Business User Completing Profile**
1. If you already have a business account created, log in as that user
2. Go to: `http://localhost:3000/en/complete-profile`
3. Type an industry in the "Industry" field (e.g., "restauration")
4. **Expected Result:** Same CLA auto-selection appears below the field

**Test 2: Employee Salary Warning**
1. Login as a Business user
2. Go to: `http://localhost:3000/en/business/employee-management`
3. Click **"Add Employee"**
4. Enter employee details:
   - Name: `Jean Dupont`
   - Position: `Serveur` (Waiter)
   - Monthly Salary: `CHF 3,000` (below CLA minimum)
5. **Expected Result:** A warning alert should appear saying the salary is below the CLA minimum wage for that role

**Test 3: Notice Period Warning**
1. Go to Document Generator
2. Try to generate a **Termination Letter** (Lettre de résiliation)
3. Enter a notice period of `7 days` (too short for most CLAs)
4. **Expected Result:** Warning that the notice period doesn't comply with the CLA requirement (usually 1-3 months)

---

### 2. 2ND PILLAR (LPP) — Pension Insurance

#### What is LPP?
LPP (Loi sur la Prévoyance Professionnelle) is the Swiss mandatory pension system. Employers must enroll employees earning above CHF 22,680/year.

#### Key 2026 Thresholds to Remember:
- **Entry threshold:** CHF 22,680/year (CHF 1,890/month)
- **Coordination deduction:** CHF 2,205/month
- **Maximum insurable salary:** CHF 90,720/year

#### How to Test:

**Test 1: LPP Enrollment Alert**
1. Go to Employee Management: `http://localhost:3000/en/business/employee-management`
2. Add a new employee with:
   - Monthly Salary: `CHF 4,500` (above threshold)
3. **Expected Result:** Alert appears saying:
   > "This employee must be enrolled in LPP pension insurance"

**Test 2: LPP Contribution Calculation**
1. View an employee's payslip or salary details
2. For an employee earning CHF 5,000/month:
   - Insured salary = 5,000 - 2,205 = **CHF 2,795**
   - LPP contribution (7%) = 2,795 × 7% = **CHF 195.65**
3. **Expected Result:** The payroll should show this calculation

**Test 3: Admin Notification**
1. When you create a new employee
2. **Expected Result:** Admin receives a notification to declare the employee to social insurance

---

### 3. DOCUMENT CENTER

#### What is it?
A place where clients and admin exchange documents (bank statements, contracts, etc.)

#### How to Test:

**Test 1: Document Request Flow**
1. **As Admin:** Go to a client's profile and click "Request Document"
2. Enter: `Please upload your March 2026 bank statement`
3. **As Client:** Login as Business user
4. Go to: `http://localhost:3000/en/business/document-center`
5. **Expected Result:** You should see the request with an "Upload" button next to it
6. Click "Upload" or click on the request itself
7. **Expected Result:** File upload dialog opens

**Test 2: General Document Upload**
1. Go to Document Center
2. Click "Upload Document" (not linked to a request)
3. Select any PDF file
4. **Expected Result:** Document appears in your document list, admin receives notification

---

### 4. DOCUMENT GENERATOR

#### What is it?
AI-powered tool that creates legal documents (contracts, letters, certificates)

#### How to Test:

**Test 1: Generate an Employment Contract**
1. Go to: `http://localhost:3000/en/business/document-generator`
2. Select template: **"Employment Contract"**
3. Fill in:
   - Employee Name: `Marie Martin`
   - Position: `Marketing Manager`
   - Start Date: `01.05.2026`
   - Salary: `CHF 6,500`
   - Working Hours: `42 hours/week`
4. Click "Generate"
5. **Expected Result:** 
   - Contract preview appears with proper formatting (paragraphs, spacing)
   - Button to "Submit for Admin Review"

**Test 2: Generate a Termination Letter**
1. Select template: **"Termination Letter"**
2. Fill in:
   - Employee Name: `Paul Bernard`
   - Last Working Day: `30.06.2026`
   - Notice Period: `1 month`
3. **Expected Result:** 
   - Letter generates properly
   - If notice period is too short, warning appears (CLA check)

**Test 3: Download as Word (.docx)**
1. Generate any document
2. Click "Download as Word"
3. **Expected Result:** 
   - File downloads as .docx
   - When opened in Word, formatting is correct (paragraphs, spacing preserved)

---

### 5. FINANCIAL SCENARIOS

#### What is it?
Calculators that help businesses and individuals compare financial options.

#### How to Test Each Scenario:

**Test 1: Hiring Cost Scenario**
1. Go to: `http://localhost:3000/en/business/financial-scenarios`
2. Select **"Hiring Simulation"**
3. Enter:
   - Gross Monthly Salary: `CHF 5,000`
   - Employee Age: `35`
   - Canton: `Vaud`
4. **Expected Result:** Shows breakdown of:
   - AVS contribution (5.3% each): CHF 265
   - LPP contribution: ~CHF 196
   - Unemployment insurance: CHF 55
   - **Total employer cost:** ~CHF 5,700-5,900

**Test 2: VAT Method Comparison**
1. Select **"VAT Method Comparison"**
2. Enter:
   - Annual Revenue: `CHF 250,000`
   - Annual Expenses: `CHF 150,000`
3. **Expected Result:** Comparison of:
   - Effective method (real VAT paid/collected)
   - Net tax method (forfait based on industry)
   - Recommendation on which method saves money

**Test 3: Revenue Growth Projection**
1. Select **"Revenue Growth"**
2. Enter:
   - Current Monthly Revenue: `CHF 50,000`
   - Target Growth Rate: `10%`
   - Annual Fixed Costs: `CHF 200,000`
3. **Expected Result:** 12-month projection showing:
   - Projected revenue per month
   - Break-even analysis
   - Profit margins

**Test 4: Investment Calculator (Compound Interest)**
1. Select **"Investment Calculator"**
2. Enter:
   - Initial Investment: `CHF 100,000`
   - Monthly Contribution: `CHF 500`
   - Annual Return Rate: `5%`
   - Duration: `20 years`
3. **Expected Result:** Should show (like UBS calculator):
   - Final value: ~CHF 431,000
   - Total contributions: CHF 220,000
   - Interest earned: ~CHF 211,000

**Test 5: Rental Yield Calculator**
1. Select **"Rental Yield (Real Estate)"**
2. Enter:
   - Purchase Price: `CHF 800,000`
   - Monthly Rent: `CHF 2,500`
   - Annual Charges: `CHF 8,000`
   - Mortgage Rate: `2%`
3. **Expected Result:** Shows:
   - Gross yield: 3.75%
   - Net yield: ~2.75%
   - Cash-on-cash return

**Test 6: Export PDF**
1. After any scenario calculation
2. Click "Export as PDF"
3. **Expected Result:** PDF downloads with all calculations and charts

---

### 6. ADMIN PANEL — NOTIFICATION CENTER

#### How to Test:
1. Go to: `http://localhost:3000/en/admin/notification-center`
2. **Expected Result:** Dashboard showing all notifications:
   - 📄 New documents uploaded
   - 👤 New employees created
   - ❓ Client questions
   - ✅ Documents awaiting approval

**Trigger Test Notifications:**
1. **As Business user:** Upload a document → Admin sees notification
2. **As Business user:** Create an employee → Admin sees notification  
3. **As Business user:** Submit a document for review → Admin sees notification

---

### 7. ADMIN — COMPANY MANAGEMENT

#### How to Test:
1. Go to: `http://localhost:3000/en/admin/company-management`
2. Click on any company name
3. **Expected Result:** Opens full company dashboard with:
   - 👥 Employee list
   - 📋 Document requests (sent to client)
   - 📁 Documents received (from client)
   - 📊 Financial data submitted
   - ✅ Tasks (pending and completed)
   - 📜 Document history

---

### 8. VIRTUAL CFO — Financial Analysis

#### What is it?
AI-powered financial analysis based on accounting data you submit.

#### How to Test:
1. Go to: `http://localhost:3000/en/business/virtual-cfo`
2. Enter monthly financial data:
   - Revenue: `CHF 80,000`
   - Cost of Goods Sold: `CHF 35,000`
   - Salaries: `CHF 25,000`
   - Rent: `CHF 3,000`
   - Marketing: `CHF 2,000`
   - Other Expenses: `CHF 5,000`
3. Click "Analyze"
4. **Expected Result:** AI generates:
   - Profit margin analysis
   - Cost breakdown charts
   - Recommendations
   - Comparison with previous months

**Test Custom Cost Centers:**
1. Ask admin to add a custom cost center (e.g., "R&D Expenses")
2. Enter data for that field
3. **Expected Result:** Field appears and is included in analysis

---

### 9. LEGAL ASSISTANT (AI Chat)

#### What is it?
An AI chatbot that answers legal questions based on Swiss law and your company's CLA.

#### How to Test:
1. Go to: `http://localhost:3000/en/business/legal-assistant`
2. Ask questions like:
   - `"What is the minimum wage for a cook in hospitality?"`
   - `"How much notice must I give to terminate an employee?"`
   - `"What are the LPP contribution rates for a 40-year-old?"`
3. **Expected Result:** AI answers using:
   - Swiss law (CO - Code des Obligations)
   - Your company's CLA (if applicable)
   - Current 2026 rates

---

### 10. ACCOUNTING FIRM FEATURES

#### How to Test:
1. Login as an Accounting Firm user
2. Go to: `http://localhost:3000/en/accounting-firm`
3. **Expected Result:** Can see list of client companies they manage
4. Select a client company
5. Use any feature (Document Generator, Legal Assistant)
6. **Expected Result:** System asks you to confirm the client's industry before applying CLA rules

---

## 🐛 KNOWN ISSUES TO VERIFY ARE FIXED

### Issue 1: Word Download Not Working
1. Generate any document
2. Click "Download as Word"
3. **Should be fixed:** File downloads and opens correctly in Word

### Issue 2: Missing Paragraph Breaks
1. Generate a contract
2. View the preview
3. **Should be fixed:** Text has proper paragraphs and spacing (not all text in one block)

---

## 📋 QUICK TEST CHECKLIST

| Feature | Test Action | Expected Result |
|---------|-------------|-----------------|
| Landing Page | Visit `/en` | See page in English with language dropdown |
| Language Switch | Click language dropdown, select "Français" | All text changes to French |
| Business Login | Complete profile as Business | CLA auto-assigned based on industry |
| Add Employee | Add employee with low salary | Warning about CLA minimum |
| Add Employee | Add employee >CHF 1,890/month | LPP enrollment alert |
| Document Request | As client, view admin request | "Upload" button visible |
| Document Generator | Generate contract | Proper formatting, downloadable |
| Financial Scenarios | Calculate hiring cost | Shows correct social charges |
| PDF Export | Export any scenario | PDF downloads with charts |
| Admin Notifications | Client uploads document | Notification appears for admin |
| Virtual CFO | Enter financial data | AI generates analysis |

---

## 💡 TESTING TIPS

1. **Open two browsers:** One as Admin, one as Business user — see real-time notifications
2. **Use realistic data:** Swiss salaries typically range CHF 4,000-15,000/month
3. **Check the console:** Press F12 → Console tab to see any JavaScript errors
4. **Test all languages:** Switch between EN, FR, DE, IT, ES to verify translations

---

## 🆘 If Something Doesn't Work

1. **Check the terminal** where `npm run dev` is running for error messages
2. **Refresh the page** (Ctrl+F5 for hard refresh)
3. **Check browser console** (F12 → Console) for JavaScript errors
4. **Restart the server:** Stop with Ctrl+C, then run `npm run dev` again

---

## 📊 Sample Test Data

### Employee for Testing
```
Name: Jean-Pierre Müller
Position: Software Developer
Salary: CHF 8,500/month
Age: 32
Start Date: 01.04.2026
Canton: Zürich
```

### Company for Testing
```
Company Name: TechStart SA
Industry: Information Technology
Address: Rue de la Gare 15, 1003 Lausanne
Number of Employees: 12
Annual Revenue: CHF 2,500,000
```

### Financial Data for Testing
```
Monthly Revenue: CHF 85,000
Cost of Goods: CHF 30,000
Salaries: CHF 35,000
Rent: CHF 4,500
Marketing: CHF 3,000
Other: CHF 4,000
```

---

Good luck testing! 🚀
