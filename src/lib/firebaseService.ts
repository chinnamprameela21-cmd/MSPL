// src/lib/firebaseService.ts
import { 
  database, 
  ref, 
  set, 
  get, 
  remove, 
  update, 
  push, 
  onValue, 
  query, 
  orderByChild, 
  equalTo, 
  child,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from './firebase';
import { 
  Employee, 
  AttendanceLog, 
  Payslip, 
  InventoryItem, 
  PayslipFormat, 
  EmployeeHelpQuery 
} from '../types';

// ============================================
// EMPLOYEES OPERATIONS
// ============================================
export const employeesService = {
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const snapshot = await get(ref(database, 'employees'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as Employee[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const snapshot = await get(ref(database, `employees/${id}`));
      if (snapshot.exists()) {
        return snapshot.val() as Employee;
      }
      return null;
    } catch (error) {
      console.error('Error fetching employee:', error);
      return null;
    }
  },

  async createEmployee(employee: Employee): Promise<void> {
    try {
      await set(ref(database, `employees/${employee.id}`), employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      await update(ref(database, `employees/${id}`), updates);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  async deleteEmployee(id: string): Promise<void> {
    try {
      await remove(ref(database, `employees/${id}`));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  subscribeToEmployees(callback: (employees: Employee[]) => void): () => void {
    const employeesRef = ref(database, 'employees');
    const unsubscribe = onValue(employeesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as Employee[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// ATTENDANCE LOGS OPERATIONS
// ============================================
export const attendanceService = {
  async getAllAttendanceLogs(): Promise<AttendanceLog[]> {
    try {
      const snapshot = await get(ref(database, 'attendanceLogs'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as AttendanceLog[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching attendance logs:', error);
      return [];
    }
  },

  async getAttendanceByEmployeeId(employeeId: string): Promise<AttendanceLog[]> {
    try {
      const snapshot = await get(
        query(ref(database, 'attendanceLogs'), orderByChild('employeeId'), equalTo(employeeId))
      );
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as AttendanceLog[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      return [];
    }
  },

  async createAttendanceLog(log: AttendanceLog): Promise<void> {
    try {
      const cleanedLog = JSON.parse(JSON.stringify(log));
      await set(ref(database, `attendanceLogs/${log.id}`), cleanedLog);
    } catch (error) {
      console.error('Error creating attendance log:', error);
      throw error;
    }
  },

  async updateAttendanceLog(id: string, updates: Partial<AttendanceLog>): Promise<void> {
    try {
      await update(ref(database, `attendanceLogs/${id}`), updates);
    } catch (error) {
      console.error('Error updating attendance log:', error);
      throw error;
    }
  },

  async deleteAttendanceLog(id: string): Promise<void> {
    try {
      await remove(ref(database, `attendanceLogs/${id}`));
    } catch (error) {
      console.error('Error deleting attendance log:', error);
      throw error;
    }
  },

  // Move an attendance log to recycle bin (soft delete)
  async moveAttendanceToRecycleBin(log: AttendanceLog, deletedBy?: string): Promise<void> {
    try {
      const payload = {
        ...log,
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || 'HR'
      } as any;
      await set(ref(database, `recycleBin/attendanceLogs/${log.id}`), payload);
      await remove(ref(database, `attendanceLogs/${log.id}`));
    } catch (error) {
      console.error('Error moving attendance log to recycle bin:', error);
      throw error;
    }
  },

  async getAllRecycleBinAttendance(): Promise<any[]> {
    try {
      const snapshot = await get(ref(database, 'recycleBin/attendanceLogs'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as any[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching recycle bin attendance logs:', error);
      return [];
    }
  },

  async restoreAttendanceFromRecycleBin(id: string): Promise<any | null> {
    try {
      const snap = await get(ref(database, `recycleBin/attendanceLogs/${id}`));
      if (!snap.exists()) return null;
      const data = snap.val();
      // Remove recycle metadata if present
      const restored = { ...data } as any;
      delete restored.deletedAt;
      delete restored.deletedBy;
      await set(ref(database, `attendanceLogs/${id}`), restored);
      await remove(ref(database, `recycleBin/attendanceLogs/${id}`));
      return restored;
    } catch (error) {
      console.error('Error restoring attendance from recycle bin:', error);
      throw error;
    }
  },

  async permanentlyDeleteFromRecycleBin(id: string): Promise<void> {
    try {
      await remove(ref(database, `recycleBin/attendanceLogs/${id}`));
    } catch (error) {
      console.error('Error permanently deleting from recycle bin:', error);
      throw error;
    }
  },

  subscribeToRecycleBin(callback: (logs: any[]) => void): () => void {
    const refBin = ref(database, 'recycleBin/attendanceLogs');
    const unsubscribe = onValue(refBin, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as any[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  },

  subscribeToAttendanceLogs(callback: (logs: AttendanceLog[]) => void): () => void {
    const logsRef = ref(database, 'attendanceLogs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as AttendanceLog[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// PAYSLIPS OPERATIONS
// ============================================
export const payslipsService = {
  async getAllPayslips(): Promise<Payslip[]> {
    try {
      const snapshot = await get(ref(database, 'payslips'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as Payslip[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching payslips:', error);
      return [];
    }
  },

  async getPayslipsByEmployeeId(employeeId: string): Promise<Payslip[]> {
    try {
      const snapshot = await get(
        query(ref(database, 'payslips'), orderByChild('employeeId'), equalTo(employeeId))
      );
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as Payslip[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching employee payslips:', error);
      return [];
    }
  },

  async createPayslip(payslip: Payslip): Promise<void> {
    try {
      await set(ref(database, `payslips/${payslip.id}`), payslip);
    } catch (error) {
      console.error('Error creating payslip:', error);
      throw error;
    }
  },

  async updatePayslip(id: string, updates: Partial<Payslip>): Promise<void> {
    try {
      await update(ref(database, `payslips/${id}`), updates);
    } catch (error) {
      console.error('Error updating payslip:', error);
      throw error;
    }
  },

  async deletePayslip(id: string): Promise<void> {
    try {
      await remove(ref(database, `payslips/${id}`));
    } catch (error) {
      console.error('Error deleting payslip:', error);
      throw error;
    }
  },

  subscribeToPayslips(callback: (payslips: Payslip[]) => void): () => void {
    const payslipsRef = ref(database, 'payslips');
    const unsubscribe = onValue(payslipsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as Payslip[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// INVENTORY OPERATIONS
// ============================================
export const inventoryService = {
  async getAllItems(): Promise<InventoryItem[]> {
    try {
      const snapshot = await get(ref(database, 'inventory'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as InventoryItem[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  },

  async createItem(item: InventoryItem): Promise<void> {
    try {
      await set(ref(database, `inventory/${item.id}`), item);
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  },

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
    try {
      await update(ref(database, `inventory/${id}`), updates);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      await remove(ref(database, `inventory/${id}`));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },

  subscribeToInventory(callback: (items: InventoryItem[]) => void): () => void {
    const inventoryRef = ref(database, 'inventory');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as InventoryItem[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// PAYSLIP FORMAT OPERATIONS
// ============================================
export const payslipFormatService = {
  async getPayslipFormat(): Promise<PayslipFormat | null> {
    try {
      const snapshot = await get(ref(database, 'payslipFormat'));
      if (snapshot.exists()) {
        return snapshot.val() as PayslipFormat;
      }
      return null;
    } catch (error) {
      console.error('Error fetching payslip format:', error);
      return null;
    }
  },

  async updatePayslipFormat(format: PayslipFormat): Promise<void> {
    try {
      await set(ref(database, 'payslipFormat'), format);
    } catch (error) {
      console.error('Error updating payslip format:', error);
      throw error;
    }
  },

  subscribeToPayslipFormat(callback: (format: PayslipFormat) => void): () => void {
    const formatRef = ref(database, 'payslipFormat');
    const unsubscribe = onValue(formatRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as PayslipFormat);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// EMPLOYEE QUERIES/SUPPORT TICKETS OPERATIONS
// ============================================
export const employeeQueriesService = {
  async getAllQueries(): Promise<EmployeeHelpQuery[]> {
    try {
      const snapshot = await get(ref(database, 'employeeQueries'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as EmployeeHelpQuery[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching employee queries:', error);
      return [];
    }
  },

  async getQueriesByEmployeeId(employeeId: string): Promise<EmployeeHelpQuery[]> {
    try {
      const snapshot = await get(
        query(ref(database, 'employeeQueries'), orderByChild('employeeId'), equalTo(employeeId))
      );
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as EmployeeHelpQuery[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching employee queries:', error);
      return [];
    }
  },

  async getQueryById(id: string): Promise<EmployeeHelpQuery | null> {
    try {
      const snapshot = await get(ref(database, `employeeQueries/${id}`));
      if (snapshot.exists()) {
        return snapshot.val() as EmployeeHelpQuery;
      }
      return null;
    } catch (error) {
      console.error('Error fetching query:', error);
      return null;
    }
  },

  async createQuery(query: EmployeeHelpQuery): Promise<void> {
    try {
      await set(ref(database, `employeeQueries/${query.id}`), query);
    } catch (error) {
      console.error('Error creating query:', error);
      throw error;
    }
  },

  async updateQuery(id: string, updates: Partial<EmployeeHelpQuery>): Promise<void> {
    try {
      await update(ref(database, `employeeQueries/${id}`), updates);
    } catch (error) {
      console.error('Error updating query:', error);
      throw error;
    }
  },

  async deleteQuery(id: string): Promise<void> {
    try {
      await remove(ref(database, `employeeQueries/${id}`));
    } catch (error) {
      console.error('Error deleting query:', error);
      throw error;
    }
  },

  subscribeToQueries(callback: (queries: EmployeeHelpQuery[]) => void): () => void {
    const queriesRef = ref(database, 'employeeQueries');
    const unsubscribe = onValue(queriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as EmployeeHelpQuery[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// CAREER POSTS OPERATIONS
// ============================================
export const careerService = {
  async getAllCareerPosts(): Promise<any[]> {
    try {
      const snapshot = await get(ref(database, 'careerPosts'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as any[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching career posts:', error);
      return [];
    }
  },

  // Create career post. If `file` is provided, upload to Firebase Storage and store `fileUrl` in DB.
  async createCareerPost(post: any, file?: File): Promise<void> {
    try {
      const postToSave: any = { ...post };
      // If file provided, upload and set fileUrl
      if (file) {
        const storagePath = `careerFiles/${post.id}/${file.name}`;
        const sRef = storageRef(storage, storagePath);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);
        postToSave.fileUrl = url;
        // remove large base64 if present
        delete postToSave.fileData;
        delete postToSave.mimeType;
      }
      await set(ref(database, `careerPosts/${post.id}`), postToSave);
    } catch (error) {
      console.error('Error creating career post:', error);
      throw error;
    }
  },

  async deleteCareerPost(id: string): Promise<void> {
    try {
      await remove(ref(database, `careerPosts/${id}`));
    } catch (error) {
      console.error('Error deleting career post:', error);
      throw error;
    }
  },

  // Update career post. If `file` provided, upload and replace fileUrl.
  async updateCareerPost(id: string, updates: Partial<any>, file?: File): Promise<void> {
    try {
      const updatesToApply: any = { ...updates };
      if (file) {
        const storagePath = `careerFiles/${id}/${file.name}`;
        const sRef = storageRef(storage, storagePath);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);
        updatesToApply.fileUrl = url;
        // remove base64 fields if present
        updatesToApply.fileData = null;
        updatesToApply.mimeType = null;
      }
      await update(ref(database, `careerPosts/${id}`), updatesToApply);
    } catch (error) {
      console.error('Error updating career post:', error);
      throw error;
    }
  },

  subscribeToCareerPosts(callback: (posts: any[]) => void): () => void {
    const postsRef = ref(database, 'careerPosts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data) as any[]);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }
};

// ============================================
// BULK OPERATIONS
// ============================================
export const bulkService = {
  async seedInitialData(
    employees: Employee[],
    attendanceLogs: AttendanceLog[],
    payslips: Payslip[],
    inventory: InventoryItem[],
    payslipFormat: PayslipFormat,
    employeeQueries: EmployeeHelpQuery[]
  ): Promise<void> {
    try {
      const updates: any = {};
      
      employees.forEach(emp => {
        updates[`employees/${emp.id}`] = emp;
      });
      
      attendanceLogs.forEach(log => {
        updates[`attendanceLogs/${log.id}`] = log;
      });
      
      payslips.forEach(slip => {
        updates[`payslips/${slip.id}`] = slip;
      });
      
      inventory.forEach(item => {
        updates[`inventory/${item.id}`] = item;
      });
      
      updates['payslipFormat'] = payslipFormat;
      
      employeeQueries.forEach(query => {
        updates[`employeeQueries/${query.id}`] = query;
      });
      
      await update(ref(database), updates);
    } catch (error) {
      console.error('Error seeding initial data:', error);
      throw error;
    }
  }
};
