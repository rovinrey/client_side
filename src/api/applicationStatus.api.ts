import axios from 'axios';

import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/api/applications`;

export interface ApplicationSubmission {
  application_id: number;
  program_type: string;
  status: string;
  rejection_reason: string | null;
  applied_at: string;
  updated_at: string;
}

export interface ApplicationStatusResponse {
  summary: Record<string, string | null>;
  submissions: ApplicationSubmission[];
}

export const applicationStatusAPI = {
  getStatus: async (userId: number | string, token: string) => {
    const response = await axios.get<ApplicationStatusResponse>(`${API_URL}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { userId }
    });

    return response.data;
  }
};

export default applicationStatusAPI;
