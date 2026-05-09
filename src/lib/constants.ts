import type { NavItem } from "@/lib/types";
import { IS_GLOBAL_TEST_MODE, PAYMENTS_DISABLED } from "@/lib/test-mode";

export { IS_GLOBAL_TEST_MODE, PAYMENTS_DISABLED };

/** Legacy alias — same as `IS_GLOBAL_TEST_MODE` (payments bypass or legacy test env flags). */
export const IS_TEST_MODE = IS_GLOBAL_TEST_MODE;

export const individualNavItems: NavItem[] = [
    { title: "Dashboard", href: "/individual/dashboard", icon: "Home", tKey: "dashboard" },
    { title: "Legal Assistant", href: "/individual/legal-assistant", icon: "Gavel", tKey: "legalAssistant" },
    { title: "Document Generator", href: "/individual/document-generator", icon: "FileText", tKey: "documentGenerator" },
    { title: "Scenario Calculator", href: "/individual/scenario-calculator", icon: "Calculator", tKey: "scenarioCalculator" },
    { title: "Yearly Tax Return", href: "/individual/tax-services", icon: "ShoppingCart", tKey: "taxServices" },
    { title: "My Documents", href: "/individual/my-documents", icon: "Folder", tKey: "myDocuments" },
    { title: "My Orders", href: "/individual/my-orders", icon: "Package", tKey: "myOrders" },
    { title: "Notifications", href: "/individual/notifications", icon: "Bell", tKey: "notifications" },
    { title: "Profile", href: "/individual/settings", icon: "User", tKey: "settings" },
    { title: "Developer test log", href: "/individual/notification-tester", icon: "Activity", tKey: "notificationTester" },
];

export const businessNavItems: NavItem[] = [
    { title: "Dashboard", href: "/business/dashboard", icon: "Home", tKey: "dashboard" },
    { title: "Legal Assistant", href: "/business/legal-assistant", icon: "Gavel", tKey: "legalAssistant" },
    { title: "Communications", href: "/business/announcements", icon: "MessageCircle", tKey: "communications" },
    { title: "Employee Management", href: "/business/employee-management", icon: "Users", tKey: "employeeManagement" },
    { title: "Payslips Communications", href: "/business/payroll-processing", icon: "Banknote", tKey: "salaryCostOverview" },
    // { title: "Leave Management", href: "/business/leave-management", icon: "Calendar", tKey: "leaveManagement" },
    { title: "Document Center", href: "/business/document-center", icon: "Folder", tKey: "documentCenter" },
    { title: "Document Generator", href: "/business/document-generator", icon: "FilePlus", tKey: "documentGenerator" },
    { title: "My Documents", href: "/business/my-documents", icon: "FileText", tKey: "myDocuments" },
    { title: "Virtual CFO", href: "/business/virtual-cfo", icon: "Briefcase", tKey: "virtualCFO" },
    { title: "Reports & Analytics", href: "/business/reports", icon: "BarChart", tKey: "reportsAnalytics" },
    { title: "Notifications", href: "/business/notifications", icon: "Bell", tKey: "notifications" },
    { title: "Notification Tester", href: "/business/notification-tester", icon: "Beaker", tKey: "notificationTester" },
];

export const accountingNavItems: NavItem[] = [
    { title: "Dashboard", href: "/accounting-firm/dashboard", icon: "Home", tKey: "dashboard" },
    { title: "AI Assistant", href: "/accounting-firm/legal-assistant", icon: "Bot", tKey: "aiAssistant" },
    { title: "Tasks", href: "/accounting-firm/tasks", icon: "ClipboardList", tKey: "tasks" },
    { title: "Billing", href: "/accounting-firm/billing", icon: "CreditCard", tKey: "billing" },
    { title: "Client Portfolio", href: "/accounting-firm/client-portfolio", icon: "Contact", tKey: "clientPortfolio" },
    { title: "Client Documents", href: "/accounting-firm/client-documents", icon: "Folder", tKey: "clientDocuments" },
    { title: "Document Inbox", href: "/accounting-firm/document-inbox", icon: "Inbox", tKey: "documentInbox" },
    { title: "Document Generator", href: "/accounting-firm/document-generator", icon: "FilePlus", tKey: "documentGenerator" },
    { title: "Scenario Analysis", href: "/accounting-firm/scenario-analysis", icon: "Calculator", tKey: "scenarioAnalysis" },
    { title: "Analytics", href: "/accounting-firm/analytics", icon: "BarChart", tKey: "analytics" },
    { title: "Audit Logs", href: "/accounting-firm/audit-logs", icon: "ShieldCheck", tKey: "auditLogs" },
    { title: "Profile", href: "/accounting-firm/settings", icon: "User", tKey: "settings" },
    { title: "Notification Tester", href: "/accounting-firm/notification-tester", icon: "Beaker", tKey: "notificationTester" },
];

export const adminNavItems: NavItem[] = [
    { title: "Dashboard", href: "/admin/dashboard", icon: "Home", tKey: "dashboard" },
    { title: "Users", href: "/admin/user-management", icon: "Users", tKey: "users" },
    { title: "Businesses", href: "/admin/company-management", icon: "Building", tKey: "businesses" },
    { title: "Accounting Firms", href: "/admin/accounting-firms", icon: "Briefcase", tKey: "accountingFirms" },
    { title: "Financial Accounts", href: "/admin/financial-accounts", icon: "BarChart3", tKey: "financialAccounts" },
    { title: "Order Management", href: "/admin/order-management", icon: "ShoppingCart", tKey: "orderManagement" },
    { title: "Document Approvals", href: "/admin/document-approvals", icon: "FileCheck", tKey: "documentApprovals" },
    { title: "Document Exchange", href: "/admin/document-exchange", icon: "ArrowLeftRight", tKey: "documentExchange" },
    { title: "Legal Database", href: "/admin/legal-database", icon: "Database", tKey: "legalDatabase" },
    { title: "Search Index", href: "/admin/search-index", icon: "Search", tKey: "searchIndex" },
    { title: "RAG Playground", href: "/admin/rag-playground", icon: "FlaskConical", tKey: "ragPlayground" },
    { title: "System Logs", href: "/admin/system-logs", icon: "ShieldAlert", tKey: "systemLogs" },
    { title: "AI Monitoring", href: "/admin/ai-monitoring", icon: "Bot", tKey: "aiMonitoring" },
    { title: "Communications", href: "/admin/communications", icon: "MessageCircle", tKey: "communications" },
    { title: "Notification Center", href: "/admin/notification-center", icon: "Bell", tKey: "notificationCenter" },
    { title: "Settings", href: "/admin/settings", icon: "Settings", tKey: "settings" },
    { title: "Notification Tester", href: "/admin/notification-tester", icon: "Beaker", tKey: "notificationTester" },
];


export const swissCantons = [
    { value: 'ag', label: 'Aargau' },
    { value: 'ar', label: 'Appenzell Ausserrhoden' },
    { value: 'ai', label: 'Appenzell Innerrhoden' },
    { value: 'bl', label: 'Basel-Landschaft' },
    { value: 'bs', label: 'Basel-Stadt' },
    { value: 'be', label: 'Bern' },
    { value: 'fr', label: 'Fribourg' },
    { value: 'ge', label: 'Geneva' },
    { value: 'gl', label: 'Glarus' },
    { value: 'gr', label: 'Grisons' },
    { value: 'ju', label: 'Jura' },
    { value: 'lu', label: 'Lucerne' },
    { value: 'ne', label: 'Neuchâtel' },
    { value: 'nw', label: 'Nidwalden' },
    { value: 'ow', label: 'Obwalden' },
    { value: 'sh', label: 'Schaffhausen' },
    { value: 'sz', label: 'Schwyz' },
    { value: 'so', label: 'Solothurn' },
    { value: 'sg', label: 'St. Gallen' },
    { value: 'tg', label: 'Thurgau' },
    { value: 'ti', label: 'Ticino' },
    { value: 'ur', label: 'Uri' },
    { value: 'vs', label: 'Valais' },
    { value: 'vd', label: 'Vaud' },
    { value: 'zg', label: 'Zug' },
    { value: 'zh', label: 'Zürich' },
];
