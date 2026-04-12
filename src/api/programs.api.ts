import axios from 'axios';
import { API_BASE_URL } from './config';

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
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get<ActiveProgram[]>(
      `${API_URL}/active/${encodeURIComponent(programType)}`,
      { headers }
    );
    return response.data;
  },
};
