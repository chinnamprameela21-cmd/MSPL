// src/lib/firebasePreferencesService.ts
import { 
  database, 
  ref, 
  set, 
  get, 
  remove, 
  update, 
  child
} from './firebase';

/**
 * Service for storing user preferences and temporary app state in Firebase
 * Replaces localStorage usage throughout the app
 */
export const preferencesService = {
  // ============ THEME PREFERENCES ============
  async setThemePreference(userId: string, isDarkMode: boolean): Promise<void> {
    try {
      await set(ref(database, `userPreferences/${userId}/theme`), {
        isDarkMode,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting theme preference:', error);
      // Fallback to localStorage
      localStorage.setItem('mspl-theme', isDarkMode ? 'dark' : 'light');
    }
  },

  async getThemePreference(userId: string): Promise<boolean | null> {
    try {
      const snapshot = await get(ref(database, `userPreferences/${userId}/theme`));
      if (snapshot.exists()) {
        return snapshot.val().isDarkMode;
      }
      return null;
    } catch (error) {
      console.error('Error getting theme preference:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('mspl-theme');
      return saved ? saved === 'dark' : null;
    }
  },

  // ============ DIRECTOR LOGIN STATUS ============
  async setDirectorLoginStatus(userId: string, isLoggedIn: boolean): Promise<void> {
    try {
      if (isLoggedIn) {
        await set(ref(database, `userPreferences/${userId}/directorLogin`), {
          isLoggedIn: true,
          loginTime: new Date().toISOString()
        });
      } else {
        await remove(ref(database, `userPreferences/${userId}/directorLogin`));
      }
    } catch (error) {
      console.error('Error setting director login status:', error);
      // Fallback to localStorage
      localStorage.setItem('mspl_director_logged_in', isLoggedIn ? 'true' : 'false');
    }
  },

  async getDirectorLoginStatus(userId: string): Promise<boolean> {
    try {
      const snapshot = await get(ref(database, `userPreferences/${userId}/directorLogin`));
      return snapshot.exists() && snapshot.val().isLoggedIn === true;
    } catch (error) {
      console.error('Error getting director login status:', error);
      // Fallback to localStorage
      return localStorage.getItem('mspl_director_logged_in') === 'true';
    }
  },

  // ============ CURRENT EMPLOYEE ============
  async setCurrentEmployee(userId: string, employee: any): Promise<void> {
    try {
      await set(ref(database, `userPreferences/${userId}/currentEmployee`), {
        ...employee,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting current employee:', error);
      // Fallback to localStorage
      localStorage.setItem('mspl_current_employee', JSON.stringify(employee));
    }
  },

  async getCurrentEmployee(userId: string): Promise<any | null> {
    try {
      const snapshot = await get(ref(database, `userPreferences/${userId}/currentEmployee`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const { updatedAt, ...employee } = data;
        return employee;
      }
      return null;
    } catch (error) {
      console.error('Error getting current employee:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('mspl_current_employee');
      return saved ? JSON.parse(saved) : null;
    }
  },

  async clearCurrentEmployee(userId: string): Promise<void> {
    try {
      await remove(ref(database, `userPreferences/${userId}/currentEmployee`));
    } catch (error) {
      console.error('Error clearing current employee:', error);
      // Fallback to localStorage
      localStorage.removeItem('mspl_current_employee');
    }
  },

  // ============ RECYCLE BIN (for EmployeePortal) ============
  async setRecycleBin(userId: string, recycleBin: any[]): Promise<void> {
    try {
      await set(ref(database, `userPreferences/${userId}/recycleBin`), {
        items: recycleBin,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting recycle bin:', error);
      // Fallback to localStorage
      localStorage.setItem('mspl_recycle_bin', JSON.stringify(recycleBin));
    }
  },

  async getRecycleBin(userId: string): Promise<any[]> {
    try {
      const snapshot = await get(ref(database, `userPreferences/${userId}/recycleBin`));
      if (snapshot.exists()) {
        return snapshot.val().items || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting recycle bin:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('mspl_recycle_bin');
      return saved ? JSON.parse(saved) : [];
    }
  },

  // ============ SELECTED CLIENT (Session-based, can keep in sessionStorage) ============
  getSelectedClient(): string | null {
    return sessionStorage.getItem('selectedClient') || null;
  },

  setSelectedClient(clientName: string): void {
    sessionStorage.setItem('selectedClient', clientName);
  },

  removeSelectedClient(): void {
    sessionStorage.removeItem('selectedClient');
  },

  // ============ CLEAR ALL PREFERENCES FOR USER ============
  async clearAllPreferences(userId: string): Promise<void> {
    try {
      await remove(ref(database, `userPreferences/${userId}`));
      // Also clear localStorage as backup
      localStorage.removeItem('mspl_director_logged_in');
      localStorage.removeItem('mspl_current_employee');
      localStorage.removeItem('mspl_recycle_bin');
      localStorage.removeItem('mspl-theme');
    } catch (error) {
      console.error('Error clearing all preferences:', error);
    }
  }
};
