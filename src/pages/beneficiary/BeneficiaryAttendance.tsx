import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../api/config';

const API_BASE = API_BASE_URL;

interface AttendanceRecord {
    attendance_id: number;
    attendance_date: string;
    time_in: string | null;
    time_out: string | null;
    status: 'Present' | 'Incomplete' | string;
    remarks: string | null;
    program_type: string | null;
}

interface TodayAttendanceResponse {
    attendance: AttendanceRecord | null;
    programType: string | null;
}

function BeneficiaryAttendance() {
    const navigate = useNavigate();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [programType, setProgramType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<'time-in' | 'time-out' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const token = useMemo(() => localStorage.getItem('token'), []);

    const authHeaders = useMemo(
        () => ({
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }),
        [token]
    );

    const loadAttendance = async () => {
        if (!token) {
            navigate('/login');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [todayResponse, recordsResponse] = await Promise.all([
                axios.get<TodayAttendanceResponse>(`${API_BASE}/api/attendance/today`, authHeaders),
                axios.get<AttendanceRecord[]>(`${API_BASE}/api/attendance`, authHeaders),
            ]);

            setTodayAttendance(todayResponse.data.attendance);
            setProgramType(todayResponse.data.programType);
            setRecords(recordsResponse.data || []);
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Failed to load attendance records.';
            setError(message);
            setTodayAttendance(null);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (!token || role !== 'beneficiary') {
            navigate('/login');
            return;
        }

        loadAttendance();
    }, [navigate, token]);

    const handleTimeIn = async () => {
        setActionLoading('time-in');
        setSuccess(null);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/api/attendance/time-in`, {}, authHeaders);
            setSuccess(response.data?.message || 'Timed in successfully.');
            await loadAttendance();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Time in failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTimeOut = async () => {
        setActionLoading('time-out');
        setSuccess(null);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/api/attendance/time-out`, {}, authHeaders);
            setSuccess(response.data?.message || 'Timed out successfully.');
            await loadAttendance();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Time out failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (value: string | null) => {
        if (!value) {
            return '-';
        }
        return new Date(value).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (value: string | null) => {
        if (!value) {
            return '-';
        }
        return new Date(value).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const canTimeIn = !todayAttendance?.time_in;
    const canTimeOut = !!todayAttendance?.time_in && !todayAttendance?.time_out;

    return (
        <section className="w-full max-w-6xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Daily Time Record (DTR)</h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">
                            Track your daily attendance for your program.
                        </p>
                    </div>

                    {programType && (
                        <span className="inline-flex w-fit rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                            Program: {programType}
                        </span>
                    )}
                </div>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Today</h2>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-white p-3 border border-gray-100">
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="text-sm font-semibold text-gray-800">{formatDate(new Date().toISOString())}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 border border-gray-100">
                            <p className="text-xs text-gray-500">Time In</p>
                            <p className="text-sm font-semibold text-gray-800">{formatTime(todayAttendance?.time_in || null)}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 border border-gray-100">
                            <p className="text-xs text-gray-500">Time Out</p>
                            <p className="text-sm font-semibold text-gray-800">{formatTime(todayAttendance?.time_out || null)}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            onClick={handleTimeIn}
                            disabled={!canTimeIn || actionLoading !== null || loading}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-700"
                        >
                            {actionLoading === 'time-in' ? 'Timing In...' : 'Time In'}
                        </button>
                        <button
                            onClick={handleTimeOut}
                            disabled={!canTimeOut || actionLoading !== null || loading}
                            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-teal-700"
                        >
                            {actionLoading === 'time-out' ? 'Timing Out...' : 'Time Out'}
                        </button>
                        {todayAttendance?.status && (
                            <span
                                className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                                    todayAttendance.status === 'Present'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-700'
                                }`}
                            >
                                Status: {todayAttendance.status}
                            </span>
                        )}
                    </div>
                </div>

                {success && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="mt-6">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Attendance</h2>

                    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Time In</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Time Out</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {!loading && records.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                                            No attendance records yet.
                                        </td>
                                    </tr>
                                )}

                                {records.map((record) => (
                                    <tr key={record.attendance_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{formatDate(record.attendance_date)}</td>
                                        <td className="px-4 py-3">{formatTime(record.time_in)}</td>
                                        <td className="px-4 py-3">{formatTime(record.time_out)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    record.status === 'Present'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}
                                            >
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{record.remarks || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default BeneficiaryAttendance;