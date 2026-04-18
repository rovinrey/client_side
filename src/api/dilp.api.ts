import axios from 'axios';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/api/applications`;

export const dilpAPI = {
  // Submit DILP application
  submitDilpApplication: async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API_URL}/apply/dilp`, data, { headers });
      return response.data;
    } catch (error) {
      console.error('Error submitting DILP application:', error);
      throw error;
    }
  },

  // Get recent DILP applications
  getRecentDilpApplications: async (limit: number = 10) => {
    try {
      const response = await axios.get(`${API_URL}/dilp/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent DILP applications:', error);
      throw error;
    }
  },

  // Get DILP application by ID
  getDilpApplicationById: async (id: number) => {
    try {
      const response = await axios.get(`${API_URL}/dilp/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching DILP application with ID ${id}:`, error);
      throw error;
    }
  },

  // Update DILP application status
  updateDilpStatus: async (id: number, status: string) => {
    try {
      const response = await axios.put(`${API_URL}/dilp/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating DILP application status:`, error);
      throw error;
    }
  },
};

export default dilpAPI;
