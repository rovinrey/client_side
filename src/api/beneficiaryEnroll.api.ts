import axios from 'axios';
import { API_BASE_URL } from './config';
import { storageGet } from '../utils/storage';

const API_URL = `${API_BASE_URL}/api/beneficiaries`;

export interface BeneficiaryProfile {
    beneficiary_id: number;
    user_id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    extension_name: string | null;
    birth_date: string | null;
    gender: string | null;
    civil_status: string | null;
    contact_number: string | null;
    address: string;
    is_active: number;
}

export interface ProgramHistoryEntry {
    application_id: number;
    program_type: string;
    status: string;
    applied_at: string;
    approval_date: string | null;
    rejection_reason: string | null;
    enrollee_id: number | null;
    enrollee_status: string | null;
    enrollment_date: string | null;
    completion_date: string | null;
    program_name: string | null;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
}

export interface DuplicateCheckResult {
    is_duplicate: boolean;
    reason: string | null;
    beneficiary_id: number | null;
    matched_beneficiary_id?: number | null;
}

export const beneficiaryEnrollAPI = {
    // Existing
    enroll: async (applicationId: number, programId: number) => {
        const token = storageGet('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post(`${API_URL}/enroll`, { applicationId, programId }, { headers });
        return response.data;
    },

    // Beneficiary Profiling
    getMyProfile: async (): Promise<BeneficiaryProfile> => {
        const token = storageGet('token');
        const response = await axios.get<BeneficiaryProfile>(`${API_URL}/profile/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    updateMyProfile: async (data: Partial<BeneficiaryProfile>): Promise<{ message: string }> => {
        const token = storageGet('token');
        const response = await axios.put(`${API_URL}/profile/me`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    checkDuplicate: async (birthDate: string): Promise<DuplicateCheckResult> => {
        const token = storageGet('token');
        const response = await axios.post<DuplicateCheckResult>(
            `${API_URL}/profile/check-duplicate`,
            { birth_date: birthDate },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    getMyProgramHistory: async (): Promise<{ history: ProgramHistoryEntry[] }> => {
        const token = storageGet('token');
        const response = await axios.get<{ history: ProgramHistoryEntry[] }>(
            `${API_URL}/profile/program-history`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },
};

export default beneficiaryEnrollAPI;
