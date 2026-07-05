/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DocumentFile {
  key: string;
  label: string;
  name: string;
  type: string;
  data: string; // Base64 or Text representation
  uploadedAt: string;
  status: 'uploaded' | 'verified';
}

export interface ClientPortalFile {
  id: string;
  fileId: string; // Unique file identifier
  fileName: string;
  fileType: string; // MIME type
  fileSize: number;
  fileData: string; // Base64 encoded file
  fileUrl?: string; // For reference
  siteId: string;
  description?: string;
  uploadedBy: string; // Employee ID who uploaded
  uploadedByName: string;
  uploadedAt: string;
  versions?: ClientPortalFileVersion[];
  clientName: string;
}

export interface ClientPortalFileVersion {
  versionId: string;
  fileName: string;
  fileData: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface RecycleBinItem {
  id: string;
  sourceType: 'employee_doc' | 'finance_doc' | 'attendance_log';
  title: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  deletedAt: string;
  originalPath: {
    employeeId?: string;
    docKey?: string;
    financeId?: string;
    attendanceId?: string;
    logData?: string; // Stringified original object
  };
}

export interface FinanceRecord {
  id: string;
  type: 'income' | 'debit' | 'investment' | 'expense';
  title: string;
  amount: number;
  date: string;
  category: string; // e.g., 'office maintenance', 'general'
  notes?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string; // Base64 data of attached bill
}

export interface Employee {
  id: string; // Employee ID Card numeric, e.g. "MSPL-EMP-101"
  role?: 'employee' | 'manager' | 'md' | 'director';
  name: string;
  status: 'approved' | 'pending' | 'revoked';
  registeredAt: string;
  avatarUrl?: string;
  phoneNumber?: string;
  password?: string;
  client?: string; // Client assignment (e.g., 'INDUS', 'JIO', 'Not Assigned')
  project?: string; // Project assignment
  // Employee profile uploads / data fields
  esic?: string; // Approved/Uploaded status or info text
  epfo?: string;
  aadhar?: string;
  pan?: string;
  passport?: string;
  resume?: string;
  studyCertificate?: string;
  bankPassbook?: string;
  leaveCert?: string;
  address?: string;
  offerLetter?: string;
  familyDetails?: string;
  isResigned?: boolean;
  leaveBalance: {
    casual: number;
    sick: number;
    annual: number;
  };
  // Dynamic document uploads
  uploadedFilesList?: DocumentFile[];
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockLevel: number;
  minThreshold: number;
  unit: string;
  warehouse: string;
  lastUpdated: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  shiftType: 'Morning' | 'Evening' | 'Night';
  timing: string;
  status: 'scheduled' | 'inprogress' | 'completed';
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  time: string;
  selfieUrl?: string;
  latitude?: number;
  longitude?: number;
  isManualOverride: boolean;
  overrideBy?: string;
}

export interface CareerPost {
  id: string;
  title: string;
  description: string;
  vacancies: number;
  fileName?: string;
  fileData?: string; // base64
  fileUrl?: string; // remote storage URL
  mimeType?: string;
  postedAt: string;
  postedBy?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  monthYear: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'unpaid';
  deliveredAt: string;
}

export interface PayslipFormat {
  companyName: string;
  companyAddress: string;
  logoUrl: string;
  authorizedSignatory: string;
  themeColor: string; // e.g. indigo, emerald, amber, slate, rose
  notes: string;
}

export interface HrUser {
  phoneNumber: string;
  password?: string;
  verified: boolean;
  isParentVerified: boolean;
}

export interface EmployeeHelpQuery {
  id: string;
  employeeId: string;
  employeeName: string;
  projectName: string;
  priority: 'normal' | 'urgent';
  queryText: string;
  attachment?: string | null;
  submittedAt: string;
  hrResponse?: string;
  hrRespondedAt?: string;
  status: 'pending' | 'resolved' | 'approved' | 'rejected';
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'word' | 'excel' | 'pdf' | 'image' | 'other';
  downloadUrl?: string;
  storagePath?: string;
  createdAt: string;
}
