import axios from 'axios';
import { API_BASE_URL } from './config';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Types ────────────────────────────────────────────

export interface ProgramBudgetRow {
    program_name: string;
    budget: number;
    used: number;
    remaining: number;
    utilization_rate: number;
    slots: number;
    filled: number;
    slot_rate: number;
    status: string;
}

export interface ProgramAccomplishmentResponse {
    period: string;
    programs: ProgramBudgetRow[];
    applicationCounts: { program_type: string; status: string; count: number }[];
    genderByProgram: { program_type: string; gender: string; count: number }[];
    totals: {
        budget: number;
        used: number;
        remaining: number;
        utilization_rate: number;
        slots: number;
        filled: number;
        slot_rate: number;
        program_count: number;
    };
}

export interface BeneficiaryRow {
    application_id: number;
    user_id: number;
    program_type: string;
    application_status: string;
    applied_at: string;
    approval_date: string | null;
    first_name: string;
    middle_name: string;
    last_name: string;
    extension_name: string;
    birth_date: string;
    age: number | null;
    gender: string;
    civil_status: string;
    contact_number: string;
    address: string;
    is_active: number;
}

export interface BeneficiaryMasterListResponse {
    beneficiaries: BeneficiaryRow[];
    demographics: {
        total: number;
        male: number;
        female: number;
        byProgram: Record<string, { total: number; male: number; female: number }>;
        byAge: Record<string, number>;
        byCivilStatus: Record<string, number>;
    };
}

export interface PayrollSummaryRecord {
    payroll_id: number;
    user_id: number;
    program_type: string;
    days_worked: number;
    daily_wage: number;
    total_payout: number;
    status: string;
    full_name: string;
    gender: string | null;
    address: string | null;
}

export interface PayrollSummaryResponse {
    month: string;
    dailyWage: number;
    byProgram: { program_type: string; status: string; beneficiary_count: number; total_days: number; total_payout: number }[];
    records: PayrollSummaryRecord[];
    disbursements: any[];
    totals: {
        beneficiary_count: number;
        total_days: number;
        total_payout: number;
        disbursement_batches: number;
        disbursed_amount: number;
    };
}

export interface AttendanceRecord {
    user_id: number;
    full_name: string;
    program_type: string;
    present_days: number;
    absent_days: number;
    incomplete_days: number;
    total_records: number;
    first_attendance: string;
    last_attendance: string;
}

export interface AttendanceSummaryResponse {
    month: string;
    programType: string;
    records: AttendanceRecord[];
    statusCounts: { program_type: string; status: string; count: number }[];
    totals: {
        beneficiaries: number;
        present_days: number;
        absent_days: number;
        total_records: number;
        compliance_rate: number;
    };
}

export interface DilpProject {
    application_id: number;
    proponent_name: string;
    project_title: string;
    project_type: string;
    category: string;
    proposed_amount: number;
    barangay: string;
    number_of_beneficiaries: number;
    estimated_monthly_income: number;
    application_status: string;
    applied_at: string;
    approval_date: string | null;
}

export interface DilpMonitoringResponse {
    period: string;
    projects: DilpProject[];
    summary: {
        total_projects: number;
        total_proposed_amount: number;
        total_beneficiaries: number;
        byCategory: { category: string; count: number; amount: number }[];
        byStatus: { status: string; count: number }[];
    };
}

export interface EmploymentFacilitationResponse {
    period: string;
    seekers: any[];
    summary: {
        total_registered: number;
        male: number;
        female: number;
        byAge: Record<string, number>;
        byWorkType: { type: string; count: number }[];
        byIndustry: { industry: string; count: number }[];
        byEmploymentStatus: { status: string; count: number }[];
    };
}

export interface SpesReportResponse {
    period: string;
    interns: any[];
    summary: {
        total: number;
        male: number;
        female: number;
        byEducation: { level: string; count: number }[];
        byStudentType: { type: string; count: number }[];
        byStatus: { status: string; count: number }[];
    };
}

export interface GipReportResponse {
    period: string;
    interns: any[];
    summary: {
        total: number;
        male: number;
        female: number;
        bySchool: { school: string; count: number }[];
        byCourse: { course: string; count: number }[];
    };
}

export interface ConsolidatedReportResponse {
    period: { startMonth: string; endMonth: string };
    applications: { program_type: string; status: string; count: number; male: number; female: number }[];
    payrollMonthly: { payroll_month: string; program_type: string; beneficiary_count: number; total_days: number; total_payout: number }[];
    payrollTotals: { total_payout: number; total_days: number; total_beneficiaries: number };
    disbursements: { status: string; batch_count: number; total_amount: number; total_recipients: number }[];
    attendance: { status: string; count: number }[];
    programBudgets: ProgramBudgetRow[];
}

// ── API Calls ────────────────────────────────────────

const BASE = `${API_BASE_URL}/api/reports`;

export const getProgramAccomplishment = async (month?: string): Promise<ProgramAccomplishmentResponse> => {
    const { data } = await axios.get(`${BASE}/program-accomplishment`, {
        headers: getAuthHeaders(),
        params: month ? { month } : {},
    });
    return data;
};

export const getBeneficiaryMasterList = async (program?: string, status?: string): Promise<BeneficiaryMasterListResponse> => {
    const { data } = await axios.get(`${BASE}/beneficiary-master-list`, {
        headers: getAuthHeaders(),
        params: { ...(program && { program }), ...(status && { status }) },
    });
    return data;
};

export const getPayrollSummary = async (month: string): Promise<PayrollSummaryResponse> => {
    const { data } = await axios.get(`${BASE}/payroll-summary`, {
        headers: getAuthHeaders(),
        params: { month },
    });
    return data;
};

export const getAttendanceSummary = async (month: string, program?: string): Promise<AttendanceSummaryResponse> => {
    const { data } = await axios.get(`${BASE}/attendance-summary`, {
        headers: getAuthHeaders(),
        params: { month, ...(program && { program }) },
    });
    return data;
};

export const getDilpMonitoring = async (month?: string): Promise<DilpMonitoringResponse> => {
    const { data } = await axios.get(`${BASE}/dilp-monitoring`, {
        headers: getAuthHeaders(),
        params: month ? { month } : {},
    });
    return data;
};

export const getEmploymentFacilitation = async (month?: string): Promise<EmploymentFacilitationResponse> => {
    const { data } = await axios.get(`${BASE}/employment-facilitation`, {
        headers: getAuthHeaders(),
        params: month ? { month } : {},
    });
    return data;
};

export const getSpesReport = async (month?: string): Promise<SpesReportResponse> => {
    const { data } = await axios.get(`${BASE}/spes`, {
        headers: getAuthHeaders(),
        params: month ? { month } : {},
    });
    return data;
};

export const getGipReport = async (month?: string): Promise<GipReportResponse> => {
    const { data } = await axios.get(`${BASE}/gip`, {
        headers: getAuthHeaders(),
        params: month ? { month } : {},
    });
    return data;
};

export const getConsolidatedReport = async (startMonth: string, endMonth: string): Promise<ConsolidatedReportResponse> => {
    const { data } = await axios.get(`${BASE}/consolidated`, {
        headers: getAuthHeaders(),
        params: { startMonth, endMonth },
    });
    return data;
};

// ── Excel Download Helpers ───────────────────────────

const downloadExcel = async (endpoint: string, params: Record<string, string>, filename: string) => {
    const response = await axios.get(`${BASE}/export/${endpoint}`, {
        headers: getAuthHeaders(),
        params,
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const exportProgramAccomplishment = (month?: string) =>
    downloadExcel('program-accomplishment', month ? { month } : {}, `Program_Accomplishment_${month || 'All'}.xlsx`);

export const exportBeneficiaryMasterList = (program?: string, status?: string) =>
    downloadExcel('beneficiary-master-list', { ...(program && { program }), ...(status && { status }) },
        `Beneficiary_Master_List_${program || 'All'}.xlsx`);

export const exportPayrollSummary = (month: string) =>
    downloadExcel('payroll-summary', { month }, `Payroll_Summary_${month}.xlsx`);

export const exportAttendanceSummary = (month: string, program?: string) =>
    downloadExcel('attendance-summary', { month, ...(program && { program }) }, `Attendance_${month}.xlsx`);

export const exportDilpMonitoring = (month?: string) =>
    downloadExcel('dilp-monitoring', month ? { month } : {}, `DILP_Monitoring_${month || 'All'}.xlsx`);

export const exportEmploymentFacilitation = (month?: string) =>
    downloadExcel('employment-facilitation', month ? { month } : {}, `Employment_Facilitation_${month || 'All'}.xlsx`);

export const exportSpesReport = (month?: string) =>
    downloadExcel('spes', month ? { month } : {}, `SPES_Report_${month || 'All'}.xlsx`);

export const exportGipReport = (month?: string) =>
    downloadExcel('gip', month ? { month } : {}, `GIP_Report_${month || 'All'}.xlsx`);

export const exportConsolidatedReport = (startMonth: string, endMonth: string) =>
    downloadExcel('consolidated', { startMonth, endMonth }, `Consolidated_${startMonth}_${endMonth}.xlsx`);
