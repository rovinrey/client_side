import axios from 'axios';
import { API_BASE_URL } from './config';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Types ────────────────────────────────────────────

export interface PayrollRecord {
    payroll_id: number;
    user_id: number;
    program_type: string;
    payroll_month: string;
    days_worked: number;
    daily_wage: number;
    total_payout: number;
    status: 'Pending' | 'Approved' | 'Released';
    remarks: string | null;
    full_name: string;
    gender: string | null;
    address: string | null;
}

export interface PayrollResponse {
    month: string;
    dailyWage: number;
    records: PayrollRecord[];
    totals: { days_worked: number; total_payout: number };
    byProgram: Record<string, { count: number; days_worked: number; total_payout: number }>;
}

export interface Disbursement {
    disbursement_id: number;
    batch_code: string;
    program_type: string;
    payroll_month: string;
    total_amount: number;
    recipient_count: number;
    payment_mode: 'GCash' | 'Cash' | 'Bank Transfer';
    status: 'Scheduled' | 'Processing' | 'Released' | 'Failed';
    reference_number: string | null;
    scheduled_date: string | null;
    released_date: string | null;
    notes: string | null;
    created_at: string;
}

export interface ProgramBreakdown {
    program_type: string;
    beneficiary_count: number;
    total_days: number;
    total_payout: number;
    avg_days_worked: number;
    avg_payout: number;
}

export interface MonthlyTrend {
    payroll_month: string;
    total_payout: number;
    total_days: number;
    beneficiary_count: number;
}

export interface AnalyticsResponse {
    month: string;
    monthlyTrend: MonthlyTrend[];
    programBreakdown: ProgramBreakdown[];
    genderBreakdown: { gender: string; count: number; total_payout: number }[];
    disbursementSummary: { status: string; count: number; total_amount: number; total_recipients: number }[];
    statusBreakdown: { status: string; count: number; total_payout: number }[];
    applicationCounts: { program_type: string; status: string; count: number }[];
    attendanceStats: { status: string; count: number }[];
}

export interface BeneficiaryPayout {
    payroll_id: number;
    program_type: string;
    payroll_month: string;
    days_worked: number;
    daily_wage: number;
    total_payout: number;
    status: string;
    remarks: string | null;
}

// ── API calls ────────────────────────────────────────

export const generatePayroll = async (month: string) => {
    const { data } = await axios.post(
        `${API_BASE_URL}/api/payroll/generate`,
        { month },
        { headers: getAuthHeaders() }
    );
    return data as { message: string; generated: number; month: string; dailyWage: number };
};

export const getPayroll = async (month: string, program?: string): Promise<PayrollResponse> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/payroll`, {
        headers: getAuthHeaders(),
        params: { month, program },
    });
    return data;
};

export const approvePayroll = async (month: string, program?: string) => {
    const { data } = await axios.put(
        `${API_BASE_URL}/api/payroll/approve`,
        { month, program },
        { headers: getAuthHeaders() }
    );
    return data;
};

export const releasePayroll = async (month: string, program?: string) => {
    const { data } = await axios.put(
        `${API_BASE_URL}/api/payroll/release`,
        { month, program },
        { headers: getAuthHeaders() }
    );
    return data;
};

export const getAnalytics = async (month?: string): Promise<AnalyticsResponse> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/payroll/analytics`, {
        headers: getAuthHeaders(),
        params: { month },
    });
    return data;
};

export const createDisbursement = async (payload: {
    program_type: string;
    payroll_month: string;
    total_amount: number;
    recipient_count: number;
    payment_mode: string;
    scheduled_date?: string;
    notes?: string;
}) => {
    const { data } = await axios.post(
        `${API_BASE_URL}/api/payroll/disbursements`,
        payload,
        { headers: getAuthHeaders() }
    );
    return data;
};

export const getDisbursements = async (month?: string): Promise<Disbursement[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/payroll/disbursements`, {
        headers: getAuthHeaders(),
        params: { month },
    });
    return data;
};

export const updateDisbursementStatus = async (
    id: number,
    status: string,
    reference_number?: string
) => {
    const { data } = await axios.put(
        `${API_BASE_URL}/api/payroll/disbursements/${id}/status`,
        { status, reference_number },
        { headers: getAuthHeaders() }
    );
    return data;
};

export const getMyPayouts = async (): Promise<{ records: BeneficiaryPayout[]; totals: { total_payout: number; total_days: number } }> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/payroll/my-payouts`, {
        headers: getAuthHeaders(),
    });
    return data;
};
