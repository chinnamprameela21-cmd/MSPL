/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Eye, Search, X, User, Calendar, MapPin, Clock, Globe, Plus, Edit, Save, UserPlus, DollarSign } from 'lucide-react';
import { Employee, AttendanceLog, Payslip, EmployeeHelpQuery, PayslipFormat, CareerPost } from '../types';
import { 
  employeesService, 
  attendanceService, 
  payslipsService, 
  employeeQueriesService,
  careerService
} from '../lib/firebaseService';

interface HrPortalProps {
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  payslips: Payslip[];
  payslipFormat: PayslipFormat;
  employeeQueries: EmployeeHelpQuery[];
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateAttendanceLogs: (logs: AttendanceLog[]) => void;
  onUpdatePayslips: (payslips: Payslip[]) => void;
  onUpdatePayslipFormat: (format: PayslipFormat) => void;
  onUpdateEmployeeQueries: (queries: EmployeeHelpQuery[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  confirmDialog: (title: string, message: string, onConfirm: () => void, confirmText?: string, isDanger?: boolean) => void;
  isDirectorLoggedIn: boolean;
  setIsDirectorLoggedIn: (val: boolean) => void;
  onSelectEmployee: (employee: Employee) => void;
}

// Prime Clients List
const PRIME_CLIENTS = [
  { id: 'INDUS', icon: '📡', desc: 'Power Infrastructure' },
  { id: 'JIO', icon: '📱', desc: 'Telecom Network' },
  { id: 'AIRTEL', icon: '📶', desc: 'Communication Services' },
  { id: 'RAILWAYS', icon: '🚆', desc: 'Signaling & OFC' },
  { id: 'SOLAR', icon: '☀️', desc: 'Energy Solutions' },
  { id: 'OTHERS', icon: '🔹', desc: 'Additional Services' }
];

const ROLES = ['employee', 'manager', 'director'];

export default function HrPortal({
  employees,
  attendanceLogs,
  payslips,
  employeeQueries,
  onUpdateEmployees,
  onUpdateAttendanceLogs,
  onUpdatePayslips,
  onUpdateEmployeeQueries,
  toast,
  confirmDialog,
  isDirectorLoggedIn,
  setIsDirectorLoggedIn,
  onSelectEmployee
}: HrPortalProps) {
  
  const [activeTab, setActiveTab] = useState('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showFullImage, setShowFullImage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayslipEditModal, setShowPayslipEditModal] = useState(false);
  const [showGeneratePayslipModal, setShowGeneratePayslipModal] = useState(false);
  const [generatePayslipEmployee, setGeneratePayslipEmployee] = useState<Employee | null>(null);
  const [generatePayslipForm, setGeneratePayslipForm] = useState({
    employeeId: '',
    monthYear: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    status: 'paid' as 'paid' | 'unpaid',
    deliveredAt: new Date().toLocaleString('en-IN')
  });
  const [hrId, setHrId] = useState('HR-001');
  const [hrPassword, setHrPassword] = useState('hr123');
  
  // 🔥 FORCE REFRESH KEY - This will force re-render of attendance logs
  const [refreshKey, setRefreshKey] = useState(0);
  const [recycleBinLogs, setRecycleBinLogs] = useState<any[]>([]);
  const [attendanceFilterDate, setAttendanceFilterDate] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  });
  const [attendanceSearchText, setAttendanceSearchText] = useState('');

  // New Employee Form State
  const [newEmployee, setNewEmployee] = useState({
    id: '',
    name: '',
    role: 'employee',
    password: 'password123',
    client: 'Not Assigned',
    phoneNumber: '',
    status: 'approved'
  });

  // Edit Employee Form State
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [originalEmployeeId, setOriginalEmployeeId] = useState<string>('');

  // Payslip Edit State
  const [editPayslip, setEditPayslip] = useState<Payslip | null>(null);
  const [payslipEmployeeName, setPayslipEmployeeName] = useState('');
  const [payslipEmployeeId, setPayslipEmployeeId] = useState('');
  const [ticketResponseDraft, setTicketResponseDraft] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketStatusDraft, setTicketStatusDraft] = useState<'pending' | 'resolved' | 'approved' | 'rejected'>('pending');

  // Career post states (HR only)
  const [careerTitle, setCareerTitle] = useState('');
  const [careerDesc, setCareerDesc] = useState('');
  const [careerVacancies, setCareerVacancies] = useState<number>(1);
  const [careerFile, setCareerFile] = useState<File | null>(null);
  const [careerPosts, setCareerPosts] = useState<CareerPost[]>([]);
  const [showCareerEditModal, setShowCareerEditModal] = useState(false);
  const [careerEditForm, setCareerEditForm] = useState<CareerPost | null>(null);
  const [careerEditFile, setCareerEditFile] = useState<File | null>(null);

  // Get attendance for a specific employee
  const getEmployeeAttendance = (employeeId: string) => {
    return attendanceLogs.filter(log => log.employeeId === employeeId);
  };

  // Career post edit / delete handlers (HR)
  const openCareerEdit = (post: CareerPost) => {
    setCareerEditForm({ ...post });
    setShowCareerEditModal(true);
  };

  const handleSaveCareerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerEditForm) return;
    try {
      const updates: any = {
        title: careerEditForm.title,
        description: careerEditForm.description,
        vacancies: careerEditForm.vacancies
      };
      await careerService.updateCareerPost(careerEditForm.id, updates, careerEditFile || undefined);
      setShowCareerEditModal(false);
      setCareerEditForm(null);
      setCareerEditFile(null);
      toast('Career post updated.', 'success');
    } catch (error) {
      console.error('Error updating career post:', error);
      toast('Failed to update career post.', 'error');
    }
  };

  const handleDeleteCareer = async (id: string) => {
    confirmDialog(
      'Delete Career Post',
      'Are you sure you want to delete this career post? This action cannot be undone.',
      async () => {
        try {
          await careerService.deleteCareerPost(id);
          setCareerPosts(prev => prev.filter(p => p.id !== id));
          toast('Career post deleted.', 'success');
        } catch (error) {
          console.error('Error deleting career post:', error);
          toast('Failed to delete career post.', 'error');
        }
      },
      'Delete',
      true
    );
  };

  const handleCareerFileChange = (f: File | null) => {
    setCareerFile(f);
  };

  const handlePostCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerTitle || !careerDesc) {
      toast('Please provide title and description.', 'error');
      return;
    }
    try {
      const id = `career-${Date.now()}`;
      const post: any = {
        id,
        title: careerTitle,
        description: careerDesc,
        vacancies: careerVacancies,
        postedAt: new Date().toISOString(),
        postedBy: hrId || 'HR'
      };
      await careerService.createCareerPost(post, careerFile || undefined);
      setCareerTitle('');
      setCareerDesc('');
      setCareerVacancies(1);
      setCareerFile(null);
      toast('Career post published.', 'success');
    } catch (error) {
      console.error('Error posting career:', error);
      toast('Failed to post career. Please try again.', 'error');
    }
  };

  // Load recycle bin on mount and subscribe for updates
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const items = await attendanceService.getAllRecycleBinAttendance();
        setRecycleBinLogs(items || []);
        unsub = attendanceService.subscribeToRecycleBin((logs) => setRecycleBinLogs(logs || []));
      } catch (error) {
        console.error('Failed to load recycle bin:', error);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Subscribe to career posts for listing and live updates
  useEffect(() => {
    let unsubPosts: (() => void) | undefined;
    (async () => {
      try {
        const posts = await careerService.getAllCareerPosts();
        setCareerPosts(posts || []);
        unsubPosts = careerService.subscribeToCareerPosts((p) => setCareerPosts(p || []));
      } catch (error) {
        console.error('Failed to load career posts:', error);
      }
    })();
    return () => { if (unsubPosts) unsubPosts(); };
  }, []);

  const handleViewAttendance = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowAttendanceModal(true);
    onSelectEmployee(employee);
  };

  const filteredAttendanceLogs = attendanceLogs.filter((log) => {
    const employee = employees.find((entry) => entry.id === log.employeeId);
    const searchValue = attendanceSearchText.trim().toLowerCase();
    const matchesDate = !attendanceFilterDate || log.date === attendanceFilterDate;
    const matchesSearch = !searchValue || [
      log.employeeName,
      log.employeeId,
      employee?.client || '',
      employee?.name || ''
    ].some((value) => value.toLowerCase().includes(searchValue));

    return matchesDate && matchesSearch;
  });

  const deleteAttendanceEntry = async (attendanceId: string) => {
    confirmDialog(
      'Delete Attendance',
      'Are you sure you want to delete this attendance record? This action cannot be undone.',
      async () => {
        try {
          // Soft-delete: move to recycle bin
          const log = attendanceLogs.find(l => l.id === attendanceId);
          if (!log) throw new Error('Attendance record not found');
          await attendanceService.moveAttendanceToRecycleBin(log, 'HR');
          const updatedAttendanceLogs = attendanceLogs.filter((l) => l.id !== attendanceId);
          onUpdateAttendanceLogs(updatedAttendanceLogs);
          setRefreshKey((prev) => prev + 1);
          toast('Attendance record deleted successfully.', 'success');
        } catch (error) {
          console.error('Error deleting attendance record:', error);
          toast('Failed to delete attendance record. Please try again.', 'error');
        }
      },
      'Delete',
      true
    );
  };

  // Restore from recycle bin
  const restoreAttendance = async (id: string) => {
    confirmDialog(
      'Restore Attendance',
      'Restore this attendance record back to active logs?',
      async () => {
        try {
          const restored = await attendanceService.restoreAttendanceFromRecycleBin(id);
          if (restored) {
            onUpdateAttendanceLogs([restored, ...attendanceLogs]);
            toast('Attendance restored successfully.', 'success');
          } else {
            toast('Could not find item in recycle bin.', 'error');
          }
        } catch (error) {
          console.error('Error restoring attendance:', error);
          toast('Failed to restore attendance. Please try again.', 'error');
        }
      },
      'Restore',
      false
    );
  };

  // Permanently delete from recycle bin
  const permanentlyDelete = async (id: string) => {
    confirmDialog(
      'Permanently Delete',
      'This will permanently delete the attendance record. Continue?',
      async () => {
        try {
          await attendanceService.permanentlyDeleteFromRecycleBin(id);
          setRecycleBinLogs(prev => prev.filter(l => l.id !== id));
          toast('Permanently deleted.', 'success');
        } catch (error) {
          console.error('Error permanently deleting:', error);
          toast('Failed to delete. Please try again.', 'error');
        }
      },
      'Delete',
      true
    );
  };

  const deleteEmployee = async (employeeId: string) => {
    confirmDialog(
      'Delete Employee',
      'Are you sure you want to delete this employee? This action cannot be undone.',
      async () => {
        try {
          // Delete from Firebase
          await employeesService.deleteEmployee(employeeId);
          
          // Also remove all related records from Firebase
          const employeeAttendance = attendanceLogs.filter(log => log.employeeId === employeeId);
          for (const log of employeeAttendance) {
            await attendanceService.deleteAttendanceLog(log.id);
          }
          
          const employeePayslips = payslips.filter(p => p.employeeId === employeeId);
          for (const payslip of employeePayslips) {
            await payslipsService.deletePayslip(payslip.id);
          }
          
          const employeeQueriesList = employeeQueries.filter(q => q.employeeId === employeeId);
          for (const query of employeeQueriesList) {
            await employeeQueriesService.deleteQuery(query.id);
          }
          
          // Update local state
          const updatedEmployees = employees.filter(e => e.id !== employeeId);
          onUpdateEmployees(updatedEmployees);
          
          const updatedAttendance = attendanceLogs.filter(log => log.employeeId !== employeeId);
          onUpdateAttendanceLogs(updatedAttendance);
          
          const updatedPayslips = payslips.filter(p => p.employeeId !== employeeId);
          onUpdatePayslips(updatedPayslips);
          
          const updatedQueries = employeeQueries.filter(q => q.employeeId !== employeeId);
          onUpdateEmployeeQueries(updatedQueries);
          
          // Force refresh
          setRefreshKey(prev => prev + 1);
          
          toast('Employee and all related records deleted successfully.', 'success');
        } catch (error) {
          console.error('Error deleting employee:', error);
          toast('Failed to delete employee. Please try again.', 'error');
        }
      },
      'Delete',
      true
    );
  };

  // Handle Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmployee.id || !newEmployee.name || !newEmployee.password) {
      toast('Please fill all required fields.', 'error');
      return;
    }

    if (employees.some(emp => emp.id === newEmployee.id)) {
      toast('Employee ID already exists. Please use a unique ID.', 'error');
      return;
    }

    try {
      const employee: Employee = {
        id: newEmployee.id,
        name: newEmployee.name,
        role: newEmployee.role as any,
        status: newEmployee.status as any,
        registeredAt: new Date().toLocaleDateString('en-IN'),
        phoneNumber: newEmployee.phoneNumber || 'N/A',
        password: newEmployee.password,
        client: newEmployee.client,
        project: newEmployee.client,
        leaveBalance: {
          casual: 8,
          sick: 10,
          annual: 15
        }
      };

      // Save to Firebase
      await employeesService.createEmployee(employee);
      
      // Update local state
      onUpdateEmployees([...employees, employee]);
      toast(`✅ Employee ${newEmployee.name} created successfully!`, 'success');
      setShowAddModal(false);
      setNewEmployee({
        id: '',
        name: '',
        role: 'employee',
        password: 'password123',
        client: 'Not Assigned',
        phoneNumber: '',
        status: 'approved'
      });
      
      // Force refresh
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding employee:', error);
      toast('Failed to add employee. Please try again.', 'error');
    }
  };

  // ================================================================
  // FIXED: Handle Edit Employee - Force update ALL related records with Firebase
  // ================================================================
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editEmployee) return;

    const oldId = originalEmployeeId;
    const newId = editEmployee.id;
    const newName = editEmployee.name;
    const normalizedClient = (editEmployee.client || 'Not Assigned').trim() || 'Not Assigned';
    const employeeToSave: Employee = {
      ...editEmployee,
      client: normalizedClient,
      project: normalizedClient === 'Not Assigned' ? 'Not Assigned' : normalizedClient
    };
    const isIdChanged = oldId !== newId;

    // Check if new ID already exists (and it's not the same employee)
    if (isIdChanged && employees.some(emp => emp.id === newId && emp.id !== oldId)) {
      toast('Employee ID already exists. Please use a unique ID.', 'error');
      return;
    }

    try {
      // --- STEP 1: Update employee in Firebase ---
      if (isIdChanged) {
        // Delete old employee and create new one with new ID
        await employeesService.deleteEmployee(oldId);
        await employeesService.createEmployee(employeeToSave);
      } else {
        // Just update existing employee
        await employeesService.updateEmployee(oldId, employeeToSave);
      }

      // --- STEP 2: Update ALL Attendance Logs in Firebase ---
      const employeeAttendanceLogs = attendanceLogs.filter(log => log.employeeId === oldId);
      for (const log of employeeAttendanceLogs) {
        if (isIdChanged) {
          await attendanceService.deleteAttendanceLog(log.id);
          await attendanceService.createAttendanceLog({
            ...log,
            employeeId: newId,
            employeeName: newName
          });
        } else {
          await attendanceService.updateAttendanceLog(log.id, {
            employeeName: newName
          });
        }
      }
      
      // --- STEP 3: Update Payslips in Firebase ---
      const employeePayslips = payslips.filter(p => p.employeeId === oldId);
      for (const payslip of employeePayslips) {
        if (isIdChanged) {
          await payslipsService.deletePayslip(payslip.id);
          await payslipsService.createPayslip({
            ...payslip,
            employeeId: newId
          });
        }
      }
      
      // --- STEP 4: Update Employee Queries in Firebase ---
      const employeeQueries2 = employeeQueries.filter(q => q.employeeId === oldId);
      for (const query of employeeQueries2) {
        if (isIdChanged) {
          await employeeQueriesService.deleteQuery(query.id);
          await employeeQueriesService.createQuery({
            ...query,
            employeeId: newId,
            employeeName: newName
          });
        } else {
          await employeeQueriesService.updateQuery(query.id, {
            employeeName: newName
          });
        }
      }

      // --- STEP 5: Update local state ---
      const updatedEmployees = employees.map(emp => 
        emp.id === oldId ? { ...employeeToSave } : emp
      );
      onUpdateEmployees(updatedEmployees);

      const updatedAttendanceLogs = attendanceLogs.map(log => {
        if (log.employeeId === oldId) {
          return { 
            ...log, 
            employeeId: newId,
            employeeName: newName
          };
        }
        return log;
      });
      
      const updatedPayslips = payslips.map(payslip => {
        if (payslip.employeeId === oldId) {
          return { ...payslip, employeeId: newId };
        }
        return payslip;
      });
      
      const updatedQueries = employeeQueries.map(query => {
        if (query.employeeId === oldId) {
          return { ...query, employeeId: newId, employeeName: newName };
        }
        return query;
      });
      
      onUpdateAttendanceLogs(updatedAttendanceLogs);
      onUpdatePayslips(updatedPayslips);
      onUpdateEmployeeQueries(updatedQueries);
      
      // --- STEP 6: Update selected employee in parent ---
      onSelectEmployee({ ...employeeToSave });
      
      // 🔥 FORCE REFRESH
      setRefreshKey(prev => prev + 1);
      
      // Get counts for success message
      const attendanceCount = attendanceLogs.filter(l => l.employeeId === oldId).length;
      const payslipCount = payslips.filter(p => p.employeeId === oldId).length;
      const queryCount = employeeQueries.filter(q => q.employeeId === oldId).length;
      
      let message = `✅ Employee ${newName} updated successfully!`;
      if (isIdChanged) {
        message += ` ID changed from ${oldId} to ${newId}.`;
      }
      message += ` (${attendanceCount} Attendance, ${payslipCount} Payslips, ${queryCount} Tickets updated)`;
      
      toast(message, 'success');

      setShowEditModal(false);
      setEditEmployee(null);
      setOriginalEmployeeId('');
    } catch (error) {
      console.error('Error editing employee:', error);
      toast('Failed to update employee. Please try again.', 'error');
    }
  };

  const openEditModal = (employee: Employee) => {
    setOriginalEmployeeId(employee.id);
    setEditEmployee({ ...employee });
    setShowEditModal(true);
  };

  const openGeneratePayslipModal = (employee?: Employee) => {
    const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    setGeneratePayslipEmployee(employee || null);
    setGeneratePayslipForm({
      employeeId: employee?.id || employees[0]?.id || '',
      monthYear: currentMonth,
      basicSalary: 0,
      allowances: 0,
      deductions: 0,
      status: 'paid',
      deliveredAt: new Date().toLocaleString('en-IN')
    });
    setShowGeneratePayslipModal(true);
  };

  const handleGeneratePayslip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!generatePayslipForm.employeeId.trim()) {
      toast('Employee ID is required.', 'error');
      return;
    }

    if (generatePayslipForm.basicSalary < 0 || generatePayslipForm.allowances < 0 || generatePayslipForm.deductions < 0) {
      toast('Salary components cannot be negative.', 'error');
      return;
    }

    const existingPayslip = payslips.find(
      (p) => p.employeeId === generatePayslipForm.employeeId && p.monthYear === generatePayslipForm.monthYear
    );

    if (existingPayslip) {
      toast(`A payslip for ${generatePayslipForm.monthYear} already exists for this employee.`, 'warning');
      return;
    }

    try {
      const newPayslip: Payslip = {
        id: `pay-${generatePayslipForm.employeeId.replace(/[^a-zA-Z0-9]/g, '')}-${generatePayslipForm.monthYear.replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
        employeeId: generatePayslipForm.employeeId,
        monthYear: generatePayslipForm.monthYear,
        basicSalary: generatePayslipForm.basicSalary,
        allowances: generatePayslipForm.allowances,
        deductions: generatePayslipForm.deductions,
        netSalary: generatePayslipForm.basicSalary + generatePayslipForm.allowances - generatePayslipForm.deductions,
        status: generatePayslipForm.status,
        deliveredAt: generatePayslipForm.deliveredAt
      };

      await payslipsService.createPayslip(newPayslip);
      const updatedPayslips = [...payslips, newPayslip];
      onUpdatePayslips(updatedPayslips);
      toast('Payslip generated successfully and preserved for this employee.', 'success');
      setShowGeneratePayslipModal(false);
      setGeneratePayslipEmployee(null);
    } catch (error) {
      console.error('Error generating payslip:', error);
      toast('Failed to generate payslip. Please try again.', 'error');
    }
  };

  const openTicketResponseEditor = (query: EmployeeHelpQuery) => {
    setSelectedTicketId(query.id);
    setTicketResponseDraft(query.hrResponse || '');
    setTicketStatusDraft((query.status as 'pending' | 'resolved' | 'approved' | 'rejected') || 'pending');
  };

  const saveTicketResponse = async () => {
    if (!selectedTicketId) return;

    const targetQuery = employeeQueries.find((q) => q.id === selectedTicketId);
    if (!targetQuery) return;

    try {
      const updatedQuery: EmployeeHelpQuery = {
        ...targetQuery,
        hrResponse: ticketResponseDraft.trim(),
        hrRespondedAt: new Date().toISOString(),
        status: ticketStatusDraft
      };

      await employeeQueriesService.updateQuery(selectedTicketId, {
        hrResponse: updatedQuery.hrResponse,
        hrRespondedAt: updatedQuery.hrRespondedAt,
        status: updatedQuery.status
      });

      const updatedQueries = employeeQueries.map((q) => (q.id === selectedTicketId ? updatedQuery : q));
      onUpdateEmployeeQueries(updatedQueries);
      toast('Ticket response and status updated successfully.', 'success');
      setSelectedTicketId(null);
      setTicketResponseDraft('');
      setTicketStatusDraft('pending');
    } catch (error) {
      console.error('Error updating ticket response:', error);
      toast('Failed to update ticket response.', 'error');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ================================================================
  // PAYSLIP EDITING FUNCTIONS
  // ================================================================
  const openPayslipEditModal = (payslip: Payslip) => {
    const emp = employees.find(e => e.id === payslip.employeeId);
    setEditPayslip(payslip);
    setPayslipEmployeeName(emp?.name || payslip.employeeId);
    setPayslipEmployeeId(payslip.employeeId);
    setShowPayslipEditModal(true);
  };

  const handleSavePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayslip) return;

    try {
      // Validate Employee ID
      if (!editPayslip.employeeId.trim()) {
        toast('Employee ID is required.', 'error');
        return;
      }

      // Check if new Employee ID exists (if changed)
      if (editPayslip.employeeId !== payslipEmployeeId) {
        const employeeExists = employees.some(emp => emp.id === editPayslip.employeeId);
        if (!employeeExists) {
          toast(`Employee ID "${editPayslip.employeeId}" does not exist.`, 'error');
          return;
        }
      }

      // Validate numbers
      if (editPayslip.basicSalary < 0 || editPayslip.allowances < 0 || editPayslip.deductions < 0) {
        toast('Salary components cannot be negative.', 'error');
        return;
      }

      // Recalculate net salary
      const updatedPayslip: Payslip = {
        ...editPayslip,
        netSalary: editPayslip.basicSalary + editPayslip.allowances - editPayslip.deductions
      };

      // Update in Firebase
      await payslipsService.updatePayslip(editPayslip.id, updatedPayslip);
      
      // Update local state
      const updatedPayslips = payslips.map(p => p.id === editPayslip.id ? updatedPayslip : p);
      onUpdatePayslips(updatedPayslips);
      
      toast(`✅ Payslip updated successfully!`, 'success');
      setShowPayslipEditModal(false);
      setEditPayslip(null);
    } catch (error) {
      console.error('Error saving payslip:', error);
      toast('Failed to save payslip. Please try again.', 'error');
    }
  };

  // Handle HR Login
  const handleHrLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hrId || !hrPassword) {
      toast('Please enter both HR ID and Password.', 'error');
      return;
    }
    
    if (hrId === 'HR-001' && hrPassword === 'hr123') {
      setIsDirectorLoggedIn(true);
      localStorage.setItem('mspl_director_logged_in', 'true');
      toast('HR Login successful!', 'success');
    } else {
      toast('Invalid HR credentials. Please try again.', 'error');
    }
  };

  // Get client icon
  const getClientIcon = (clientId: string) => {
    const client = PRIME_CLIENTS.find(c => c.id === clientId);
    return client ? client.icon : '🏢';
  };

  // If not logged in, show login screen
  if (!isDirectorLoggedIn) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👔</div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-white">HR Login</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enter your HR credentials</p>
        </div>
        
        <form onSubmit={handleHrLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">HR ID</label>
            <input
              type="text"
              placeholder="e.g., HR-001"
              value={hrId}
              onChange={(e) => setHrId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={hrPassword}
              onChange={(e) => setHrPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition"
          >
            Sign In as HR
          </button>
          <p className="text-[10px] text-slate-400 text-center">
            Demo: <span className="font-mono font-bold">HR-001</span> / <span className="font-mono font-bold">hr123</span>
          </p>
        </form>
      </div>
    );
  }

  // HR Dashboard
  return (
    <div className="space-y-6">
      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-2xl font-bold text-indigo-600">{employees.length}</div>
          <div className="text-xs text-slate-500">Employees</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-2xl font-bold text-emerald-600">{attendanceLogs.length}</div>
          <div className="text-xs text-slate-500">Attendance Records</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-2xl font-bold text-amber-600">{payslips.length}</div>
          <div className="text-xs text-slate-500">Payslips</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-2xl font-bold text-purple-600">{employeeQueries.length}</div>
          <div className="text-xs text-slate-500">Support Tickets</div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setIsDirectorLoggedIn(false);
            localStorage.removeItem('mspl_director_logged_in');
            toast('Logged out successfully.', 'info');
          }}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-bold transition"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'employees', label: '👥 Employees' },
          { id: 'attendance', label: '📋 All Attendance' },
          { id: 'career', label: '💼 Career' },
          { id: 'recycle', label: '🗑️ Recycle Bin' },
          { id: 'payslips', label: '💰 Payslips' },
          { id: 'queries', label: '🎫 Support Tickets' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-md shadow-emerald-500/20"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Photo</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">ID</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Name</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Role</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Client</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => (
                      <tr key={emp.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div 
                            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
                            onClick={() => {
                              if (emp.avatarUrl) {
                                setShowFullImage(emp.avatarUrl);
                              } else {
                                const initials = emp.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                                toast(`👤 ${emp.name}`, 'info');
                              }
                            }}
                          >
                            {emp.avatarUrl ? (
                              <img src={emp.avatarUrl} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                {emp.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{emp.id}</td>
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            emp.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            emp.role === 'director' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <span>{getClientIcon(emp.client || 'Not Assigned')}</span>
                            <span>{emp.client || 'Not Assigned'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            emp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewAttendance(emp)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                              title="View Attendance History"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openGeneratePayslipModal(emp)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                              title="Generate Payslip"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"
                              title="Edit Employee"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEmployee(emp.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ALL ATTENDANCE TAB - With Refresh Key */}
      {/* ============================================================ */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden" key={refreshKey}>
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Select Date</label>
              <input
                type="date"
                value={attendanceFilterDate}
                onChange={(e) => setAttendanceFilterDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Search Employee / ID / Client</label>
              <input
                type="text"
                placeholder="Type employee name, ID or client"
                value={attendanceSearchText}
                onChange={(e) => setAttendanceSearchText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAttendanceFilterDate(new Date().toISOString().slice(0, 10))}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setAttendanceFilterDate(yesterday.toISOString().slice(0, 10));
                }}
                className="rounded-lg bg-slate-200 dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Previous Day
              </button>
              <button
                onClick={() => {
                  setAttendanceFilterDate('');
                  setAttendanceSearchText('');
                }}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Show All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">#</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Employee</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">ID</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Client</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Time</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">GPS Latitude</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">GPS Longitude</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Selfie</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No attendance records found for this date/search.
                    </td>
                  </tr>
                ) : (
                  filteredAttendanceLogs.slice(0, 100).map((log, index) => {
                    // Find employee to get the latest client info
                    const emp = employees.find(e => e.id === log.employeeId);
                    return (
                      <tr key={`${log.id}-${refreshKey}`} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-center text-xs text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{log.employeeName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                          {log.employeeId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs">
                            <span>{getClientIcon(emp?.client || 'Not Assigned')}</span>
                            <span>{emp?.client || 'N/A'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">{log.date}</td>
                        <td className="px-4 py-3">{log.time}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {log.latitude ? log.latitude.toFixed(6) : 'N/A'}° N
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {log.longitude ? log.longitude.toFixed(6) : 'N/A'}° E
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Present
                          </span>
                          {log.isManualOverride && (
                            <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold">Manual</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.selfieUrl ? (
                            <img 
                              src={log.selfieUrl} 
                              alt="Selfie" 
                              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
                              onClick={() => setShowFullImage(log.selfieUrl ?? null)}
                            />
                          ) : (
                            <span className="text-xs text-slate-400">No photo</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteAttendanceEntry(log.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                            title="Delete attendance record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredAttendanceLogs.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
                Showing first 100 records out of {filteredAttendanceLogs.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recycle Bin Tab */}
      {activeTab === 'recycle' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Recycle Bin — Attendance</h3>
          {recycleBinLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Recycle bin is empty.</div>
          ) : (
            <div className="space-y-3">
              {recycleBinLogs.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="font-bold">{item.employeeName} • {item.employeeId}</div>
                    <div className="text-xs text-slate-500">{item.date} {item.time} • Deleted: {new Date(item.deletedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => restoreAttendance(item.id)} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Restore</button>
                    <button onClick={() => permanentlyDelete(item.id)} className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold">Delete Permanently</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Career Management (HR only) */}
      {activeTab === 'career' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Career Postings (HR only)</h3>
          <form onSubmit={handlePostCareer} className="grid grid-cols-1 gap-3 max-w-2xl">
            <input value={careerTitle} onChange={e => setCareerTitle(e.target.value)} placeholder="Job title" className="px-4 py-2 rounded-xl border" />
            <textarea value={careerDesc} onChange={e => setCareerDesc(e.target.value)} placeholder="Short description" className="px-4 py-2 rounded-xl border h-28" />
            <div className="flex gap-2">
              <input type="number" value={careerVacancies} onChange={e => setCareerVacancies(Number(e.target.value))} min={1} className="px-4 py-2 rounded-xl border w-40" />
              <input type="file" onChange={e => handleCareerFileChange(e.target.files ? e.target.files[0] : null)} className="px-4 py-2 rounded-xl border" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl">Publish</button>
            </div>
          </form>

          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Existing Posts</h4>
            {careerPosts.length === 0 ? (
              <div className="text-sm text-slate-500">No career posts yet.</div>
            ) : (
              <div className="space-y-3">
                {careerPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="font-bold">{post.title} <span className="text-xs text-slate-500">• {post.vacancies} vacancies</span></div>
                      <div className="text-xs text-slate-400">Posted: {new Date(post.postedAt).toLocaleString()} • By: {post.postedBy || 'HR'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.fileData && (
                        <button
                          onClick={() => {
                            try {
                              const dataUrl = post.fileData || '';
                              const arr = dataUrl.split(',');
                              const mime = arr[0].match(/:(.*?);/)?.[1] || post.mimeType || 'application/octet-stream';
                              const bstr = atob(arr[1]);
                              let n = bstr.length;
                              const u8arr = new Uint8Array(n);
                              while (n--) {
                                u8arr[n] = bstr.charCodeAt(n);
                              }
                              const blob = new Blob([u8arr], { type: mime });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = post.fileName || 'attachment';
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error('Download failed', err);
                              toast('Failed to download file.', 'error');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs"
                        >
                          Download
                        </button>
                      )}
                      <button onClick={() => openCareerEdit(post)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs">Edit</button>
                      <button onClick={() => handleDeleteCareer(post.id)} className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payslips Tab */}
      {activeTab === 'payslips' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payslip Records</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create and edit payslips for individual employees.</p>
            </div>
            <button
              onClick={() => openGeneratePayslipModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Generate Payslip
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">#</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Employee</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">ID</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Client</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Month</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Net Salary</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No payslips found.
                    </td>
                  </tr>
                ) : (
                  payslips.map((p, index) => {
                    const emp = employees.find(e => e.id === p.employeeId);
                    return (
                      <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 text-center text-xs text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{emp?.name || p.employeeId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                          {p.employeeId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs">
                            <span>{getClientIcon(emp?.client || 'Not Assigned')}</span>
                            <span>{emp?.client || 'N/A'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">{p.monthYear}</td>
                        <td className="px-4 py-3 font-bold">₹{p.netSalary.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openPayslipEditModal(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-1 mx-auto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGeneratePayslipModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Generate Payslip
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create a new payslip for an employee. Existing payslips are preserved.
                </p>
              </div>
              <button
                onClick={() => setShowGeneratePayslipModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayslip} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Employee</label>
                  <select
                    value={generatePayslipForm.employeeId}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, employeeId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Month / Year</label>
                  <input
                    type="text"
                    value={generatePayslipForm.monthYear}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, monthYear: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Basic Salary</label>
                  <input
                    type="number"
                    value={generatePayslipForm.basicSalary}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, basicSalary: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Allowances</label>
                  <input
                    type="number"
                    value={generatePayslipForm.allowances}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, allowances: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Deductions</label>
                  <input
                    type="number"
                    value={generatePayslipForm.deductions}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, deductions: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={generatePayslipForm.status}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, status: e.target.value as 'paid' | 'unpaid' })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Delivered At</label>
                  <input
                    type="text"
                    value={generatePayslipForm.deliveredAt}
                    onChange={(e) => setGeneratePayslipForm({ ...generatePayslipForm, deliveredAt: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGeneratePayslipModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Generate Payslip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Tickets Tab */}
      {activeTab === 'queries' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">#</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Ticket</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Employee</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">ID</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Client</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Priority</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {employeeQueries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No support tickets found.
                    </td>
                  </tr>
                ) : (
                  employeeQueries.map((q, index) => {
                    const emp = employees.find(e => e.id === q.employeeId);
                    return (
                      <tr key={q.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 text-center text-xs text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{q.id}</td>
                        <td className="px-4 py-3 font-medium">{q.employeeName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                          {q.employeeId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs">
                            <span>{getClientIcon(emp?.client || 'Not Assigned')}</span>
                            <span>{emp?.client || 'N/A'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            q.status === 'resolved' || q.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            q.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            q.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {q.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openTicketResponseEditor(q)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                          >
                            Respond
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {selectedTicketId && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-950/30">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Respond to Ticket {selectedTicketId}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update the status and leave an HR response for this ticket.</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTicketId(null);
                    setTicketResponseDraft('');
                    setTicketStatusDraft('pending');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={ticketStatusDraft}
                    onChange={(e) => setTicketStatusDraft(e.target.value as 'pending' | 'resolved' | 'approved' | 'rejected')}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">HR Response</label>
                  <textarea
                    rows={4}
                    value={ticketResponseDraft}
                    onChange={(e) => setTicketResponseDraft(e.target.value)}
                    placeholder="Enter the response for the employee"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveTicketResponse}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Response
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD EMPLOYEE MODAL */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add New Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Employee ID *</label>
                <input
                  type="text"
                  placeholder="e.g., MSPL-EMP-201"
                  value={newEmployee.id}
                  onChange={(e) => setNewEmployee({...newEmployee, id: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Role *</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={newEmployee.status}
                    onChange={(e) => setNewEmployee({...newEmployee, status: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Assign to Prime Client</label>
                <select
                  value={newEmployee.client}
                  onChange={(e) => setNewEmployee({...newEmployee, client: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="Not Assigned">— Not Assigned —</option>
                  {PRIME_CLIENTS.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.icon} {client.id} — {client.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g., 9876543210"
                  value={newEmployee.phoneNumber}
                  onChange={(e) => setNewEmployee({...newEmployee, phoneNumber: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Password *</label>
                <input
                  type="text"
                  placeholder="Set a password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Create Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT EMPLOYEE MODAL - UPDATES ALL RECORDS */}
      {/* ============================================================ */}
      {showEditModal && editEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                Edit Employee
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Employee ID *</label>
                <input
                  type="text"
                  placeholder="e.g., MSPL-EMP-101"
                  value={editEmployee.id}
                  onChange={(e) => setEditEmployee({...editEmployee, id: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
                <div className="text-[9px] text-amber-600 mt-1 space-y-0.5">
                  <p>⚠️ Changing ID will update all related records:</p>
                  <p className="text-slate-500">
                    Attendance: <span className="font-bold text-indigo-600">{attendanceLogs.filter(l => l.employeeId === originalEmployeeId).length}</span> | 
                    Payslips: <span className="font-bold text-amber-600">{payslips.filter(p => p.employeeId === originalEmployeeId).length}</span> | 
                    Tickets: <span className="font-bold text-purple-600">{employeeQueries.filter(q => q.employeeId === originalEmployeeId).length}</span>
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={editEmployee.name}
                  onChange={(e) => setEditEmployee({...editEmployee, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Role</label>
                  <select
                    value={editEmployee.role}
                    onChange={(e) => setEditEmployee({...editEmployee, role: e.target.value as 'employee' | 'manager' | 'director' | 'md'})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={editEmployee.status}
                    onChange={(e) => setEditEmployee({...editEmployee, status: e.target.value as 'pending' | 'approved' | 'revoked'})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Assign to Prime Client</label>
                <select
                  value={editEmployee.client || 'Not Assigned'}
                  onChange={(e) => setEditEmployee({...editEmployee, client: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="Not Assigned">— Not Assigned —</option>
                  {PRIME_CLIENTS.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.icon} {client.id} — {client.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={editEmployee.phoneNumber || ''}
                  onChange={(e) => setEditEmployee({...editEmployee, phoneNumber: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Password (Leave blank to keep current)</label>
                <input
                  type="text"
                  placeholder="Enter new password to change"
                  onChange={(e) => {
                    if (e.target.value) {
                      setEditEmployee({...editEmployee, password: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Update Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PAYSLIP EDIT MODAL */}
      {/* ============================================================ */}
      {showPayslipEditModal && editPayslip && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  Edit Payslip
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Employee: <span className="font-bold text-slate-700 dark:text-slate-200">{payslipEmployeeName}</span> ({payslipEmployeeId})
                </p>
              </div>
              <button
                onClick={() => setShowPayslipEditModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSavePayslip} className="space-y-6">
              {/* Payslip Details */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Employee ID *</label>
                    <input
                      type="text"
                      value={editPayslip.employeeId}
                      onChange={(e) => setEditPayslip({...editPayslip, employeeId: e.target.value})}
                      placeholder="e.g., EMP-001"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Month & Year *</label>
                    <input
                      type="text"
                      value={editPayslip.monthYear}
                      onChange={(e) => setEditPayslip({...editPayslip, monthYear: e.target.value})}
                      placeholder="e.g., May 2026"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Status</label>
                    <select
                      value={editPayslip.status}
                      onChange={(e) => setEditPayslip({...editPayslip, status: e.target.value as 'paid' | 'unpaid'})}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Basic Salary (₹)</label>
                    <input
                      type="number"
                      value={editPayslip.basicSalary}
                      onChange={(e) => setEditPayslip({...editPayslip, basicSalary: Math.max(0, parseFloat(e.target.value) || 0)})}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Allowances (₹)</label>
                    <input
                      type="number"
                      value={editPayslip.allowances}
                      onChange={(e) => setEditPayslip({...editPayslip, allowances: Math.max(0, parseFloat(e.target.value) || 0)})}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      min="0"
                      step="50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Deductions (₹)</label>
                    <input
                      type="number"
                      value={editPayslip.deductions}
                      onChange={(e) => setEditPayslip({...editPayslip, deductions: Math.max(0, parseFloat(e.target.value) || 0)})}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      min="0"
                      step="50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Delivery Date</label>
                    <input
                      type="text"
                      value={editPayslip.deliveredAt}
                      onChange={(e) => setEditPayslip({...editPayslip, deliveredAt: e.target.value})}
                      placeholder="e.g., 05/31/2026 3:30 PM"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Net Salary Preview */}
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">Basic</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">₹{editPayslip.basicSalary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">Allowances</p>
                    <p className="text-lg font-bold text-emerald-600">₹{editPayslip.allowances.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">Deductions</p>
                    <p className="text-lg font-bold text-rose-600">₹{editPayslip.deductions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">Net Salary</p>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{(editPayslip.basicSalary + editPayslip.allowances - editPayslip.deductions).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPayslipEditModal(false)}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Payslip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Career Edit Modal */}
      {showCareerEditModal && careerEditForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Career Post</h3>
              <button onClick={() => { setShowCareerEditModal(false); setCareerEditForm(null); setCareerEditFile(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSaveCareerEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Job Title</label>
                <input type="text" value={careerEditForm.title} onChange={e => setCareerEditForm({ ...careerEditForm, title: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Description</label>
                <textarea value={careerEditForm.description} onChange={e => setCareerEditForm({ ...careerEditForm, description: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl h-28" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Vacancies</label>
                  <input type="number" value={careerEditForm.vacancies} onChange={e => setCareerEditForm({ ...careerEditForm, vacancies: Number(e.target.value) })} className="w-full px-4 py-2.5 border rounded-xl" min={1} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Replace Attachment (optional)</label>
                  <input type="file" onChange={e => setCareerEditFile(e.target.files ? e.target.files[0] : null)} className="w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCareerEditModal(false); setCareerEditForm(null); setCareerEditFile(null); }} className="px-4 py-2.5 rounded-xl border">Cancel</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-amber-600 text-white">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ATTENDANCE HISTORY MODAL */}
      {/* ============================================================ */}
      {showAttendanceModal && selectedEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition flex-shrink-0"
                  onClick={() => {
                    if (selectedEmployee.avatarUrl) {
                      setShowFullImage(selectedEmployee.avatarUrl ?? null);
                    }
                  }}
                >
                  {selectedEmployee.avatarUrl ? (
                    <img src={selectedEmployee.avatarUrl} alt={selectedEmployee.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                      {selectedEmployee.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedEmployee.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedEmployee.id} • {selectedEmployee.role} • {selectedEmployee.status}
                    {selectedEmployee.client && selectedEmployee.client !== 'Not Assigned' && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span>{getClientIcon(selectedEmployee.client)}</span>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{selectedEmployee.client}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{getEmployeeAttendance(selectedEmployee.id).length}</div>
                <div className="text-xs text-slate-500">Total Attendance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {getEmployeeAttendance(selectedEmployee.id).filter(log => log.date === new Date().toISOString().substring(0, 10)).length}
                </div>
                <div className="text-xs text-slate-500">Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {payslips.filter(p => p.employeeId === selectedEmployee.id).length}
                </div>
                <div className="text-xs text-slate-500">Payslips</div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Attendance History with GPS Location
              </h4>
              
              {getEmployeeAttendance(selectedEmployee.id).length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No attendance records found for this employee.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getEmployeeAttendance(selectedEmployee.id).map(log => (
                    <div key={`${log.id}-${refreshKey}`} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                      <div className="flex items-center gap-4">
                        {log.selfieUrl ? (
                          <img 
                            src={log.selfieUrl} 
                            alt="Selfie" 
                            className="w-12 h-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
                            onClick={() => setShowFullImage(log.selfieUrl ?? null)}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">{log.date}</span>
                            <span className="text-xs text-slate-500">{log.time}</span>
                            {log.isManualOverride && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold">Manual</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-indigo-500" />
                              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                {log.latitude ? log.latitude.toFixed(6) : 'N/A'}° N
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-indigo-500" />
                              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                {log.longitude ? log.longitude.toFixed(6) : 'N/A'}° E
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {log.latitude && log.longitude ? '📍 GPS Locked' : 'No GPS'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          Present
                        </span>
                        <button
                          onClick={() => deleteAttendanceEntry(log.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                          title="Delete attendance record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* FULL IMAGE MODAL */}
      {/* ============================================================ */}
      {showFullImage && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFullImage(null)}
        >
          <div className="relative max-w-2xl w-full">
            <button
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition p-2"
              onClick={() => setShowFullImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={showFullImage} 
              alt="Full view" 
              className="w-full h-auto rounded-2xl shadow-2xl object-contain max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-white/60 text-xs mt-4">Click anywhere to close</p>
          </div>
        </div>
      )}

    </div>
  );
}