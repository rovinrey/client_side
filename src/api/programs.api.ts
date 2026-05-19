import axios from 'axios';
import { API_BASE_URL } from './config';
import { storageGet } from '../utils/storage';

const API_URL = `${API_BASE_URL}/api/programs`;

export interface ActiveProgram {
  program_id: number;
  program_name: string;
  location: string;
  slots: number;
  filled: number;
  budget: number;
  status: string;
  start_date: string;
  end_date: string;
}

export const programsAPI = {
  getActiveByType: async (programType: string): Promise<ActiveProgram[]> => {
    const token = storageGet('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get<ActiveProgram[]>(
      `${API_URL}/active/${encodeURIComponent(programType)}`,
      { headers }
    );
    return response.data;
  },

  getReadyPrograms: async (): Promise<ActiveProgram[]> => {
    const token = storageGet('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      // Try to get ready programs from the dedicated endpoint
      const response = await axios.get<ActiveProgram[]>(
        `${API_URL}/ready`,
        { headers }
      );
      return response.data;
    } catch (error) {
      // If /ready endpoint doesn't exist (404), fall back to allPrograms
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('Ready programs endpoint not available, falling back to all programs');
        const response = await axios.get<ActiveProgram[]>(
          `${API_URL}/allPrograms`,
          { headers }
        );
        return response.data.filter(p => 
          (p.status === 'active' || p.status === 'ongoing') && 
          ((p.slots - (p.filled || 0)) > 0)
        );
      }
      // Re-throw any other errors
      throw error;
    }
  },
};

