import axios from 'axios';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/api/forms`;

export const gipAPI = {
  submitGipApplication: async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API_URL}/apply/gip`, data, { headers });
      return response.data;
    } catch (error) {
      console.error('Error submitting GIP application:', error);
      throw error;
    }
  },
};
