import axios from 'axios';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/api/beneficiaries`;

export const beneficiaryEnrollAPI = {
  enroll: async (applicationId: number, programId: number) => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.post(`${API_URL}/enroll`, { applicationId, programId }, { headers });
    return response.data;
  },
};

export default beneficiaryEnrollAPI;
