// Mirrors the DTOs in the Spring Boot API (com.example.hrms.*Dtos).

export type Role = "HR_ADMIN" | "MANAGER" | "EMPLOYEE";
export const ROLES: Role[] = ["EMPLOYEE", "MANAGER", "HR_ADMIN"];

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "TERMINATED";
export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["ACTIVE", "INACTIVE", "TERMINATED"];

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";
export const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"];

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export const LEAVE_STATUSES: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export type DayOfWeek =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export const DAYS_OF_WEEK: DayOfWeek[] = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];

/** GET /auth/me */
export interface AuthUser {
  userId: string;
  tenantId: string;
  employeeId: string | null;
  email: string;
  roles: Role[];
  /** Someone else chose this user's password; they must pick their own before using the app. */
  passwordChangeRequired: boolean;
}

/** POST /auth/login, POST /tenants/register (token stripped by our route handlers). */
export interface AuthResponse extends AuthUser {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  weekendDays: DayOfWeek[];
  active: boolean;
}

export type SmtpSecurity = "STARTTLS" | "SSL" | "NONE";

/** GET/PUT /tenant/email-settings (HR only). The saved SMTP password is never returned. */
export interface EmailSettings {
  senderName: string | null;
  replyTo: string | null;
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecurity: SmtpSecurity | null;
  smtpUsername: string | null;
  smtpPasswordSet: boolean;
  smtpFromEmail: string | null;
  /** Last failure of the company's own mail server; emails then went out from the platform address. */
  lastError: string | null;
  lastErrorAt: string | null;
  companyName: string;
  platformFromAddress: string;
}

/** Body for PUT /tenant/email-settings and POST /tenant/email-settings/test. Blank password = keep saved. */
export interface EmailSettingsInput {
  senderName: string | null;
  replyTo: string | null;
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecurity: SmtpSecurity | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
}

export interface TestEmailResult {
  sentTo: string;
  via: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
}

/** Personal fields are omitted when the viewer is a manager (reduced view). */
export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  designation?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  joinDate: string;
  status: EmployeeStatus;
  hasLogin: boolean;
  roles?: Role[] | null;
  nationalId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  defaultDays: number;
  maxCarryForward: number;
  paid: boolean;
  active: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  carriedForward: number;
  used: number;
  pending: number;
  available: number;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approverName: string | null;
  decidedById: string | null;
  decidedByName: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

/** GET /leave-calendar: who is off between `from` and `to`. */
export interface LeaveCalendar {
  from: string;
  to: string;
  /** COMPANY for HR (everyone), TEAM for everyone else. */
  scope: "COMPANY" | "TEAM";
  weekendDays: DayOfWeek[];
  holidays: Holiday[];
  people: CalendarPerson[];
  leaves: CalendarLeave[];
}

export interface CalendarPerson {
  employeeId: string;
  fullName: string;
  designation: string | null;
  departmentName: string | null;
  self: boolean;
}

/** leaveType and reason are null unless the viewer is the employee, their approver or HR. */
export interface CalendarLeave {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  days: number;
  status: "APPROVED" | "PENDING";
  leaveType: string | null;
  reason: string | null;
  canDecide: boolean;
}

/** GET /leave-calendar/approval-overlaps: teammates also off during each pending request. */
export interface ApprovalOverlap {
  requestId: string;
  others: {
    employeeId: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    halfDay: boolean;
    status: "APPROVED" | "PENDING";
  }[];
}

export interface AllocationResult {
  year: number;
  balancesCreated: number;
}

/** Spring Data page serialised VIA_DTO. */
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

// ---------------------------------------------------------------- platform (super user)

/** GET /platform/auth/me */
export interface PlatformAdmin {
  id: string;
  email: string;
  fullName: string;
  lastLoginAt: string | null;
}

export interface PlatformOverview {
  tenants: number;
  activeTenants: number;
  activeEmployees: number;
  users: number;
}

/** A company as the platform sees it: settings and headline counts, never its HR records. */
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  weekendDays: DayOfWeek[];
  active: boolean;
  createdAt: string;
  activeEmployees: number;
  users: number;
}

export interface TenantAdmin {
  userId: string;
  employeeId: string | null;
  fullName: string;
  email: string;
  active: boolean;
  createdAt: string;
}
