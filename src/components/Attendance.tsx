import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface AttendanceRecord {
    attendance_id: number;
    attendance_date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    remarks?: string | null;
    program_type?: string | null;
}

interface TodayAttendanceResponse {
    attendance: AttendanceRecord | null;
    programType: string;
}

const Attendance = () => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [approvedProgram, setApprovedProgram] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const token = localStorage.getItem('token');

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Bearer ${token}` }
    }), [token]);

    const fetchAttendance = async () => {
        setLoading(true);
        setError(null);

        try {
            const [historyRes, todayRes] = await Promise.all([
                axios.get<AttendanceRecord[]>(`${API_BASE_URL}/api/attendance`, authHeaders),
                axios.get<TodayAttendanceResponse>(`${API_BASE_URL}/api/attendance/today`, authHeaders)
            ]);

            setAttendance(historyRes.data || []);
            setTodayAttendance(todayRes.data?.attendance || null);
            setApprovedProgram(todayRes.data?.programType || null);
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Failed to load attendance records.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const timeIn = async () => {
        setActionLoading(true);
        setError(null);

        try {
            await axios.post(`${API_BASE_URL}/api/attendance/time-in`, {}, authHeaders);
            await fetchAttendance();
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Time in failed.';
            setError(message);
        } finally {
            setActionLoading(false);
        }
    };

    const timeOut = async () => {
        setActionLoading(true);
        setError(null);

        try {
            await axios.post(`${API_BASE_URL}/api/attendance/time-out`, {}, authHeaders);
            await fetchAttendance();
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Time out failed.';
            setError(message);
        } finally {
            setActionLoading(false);
        }
    };

    const canTimeIn = !todayAttendance?.time_in;
    const canTimeOut = Boolean(todayAttendance?.time_in && !todayAttendance?.time_out);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatDateTime = (value: string | null) => {
        if (!value) {
            return '—';
        }

        return new Date(value).toLocaleString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const todayStatusLabel = todayAttendance?.status || 'Not timed in';

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900">Attendance</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {approvedProgram
                                ? `Approved Program: ${approvedProgram}`
                                : 'Attendance becomes available once your application is approved.'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={timeIn}
                            disabled={actionLoading || !approvedProgram || !canTimeIn}
                            className="px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading ? 'Processing...' : 'Time In'}
                        </button>
                        <button
                            onClick={timeOut}
                            disabled={actionLoading || !approvedProgram || !canTimeOut}
                            className="px-4 py-2 rounded-lg font-semibold text-sm bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading ? 'Processing...' : 'Time Out'}
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Today</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDate(new Date().toISOString())}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Time In</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDateTime(todayAttendance?.time_in || null)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Status</p>
                        <p className="text-sm font-semibold text-gray-800">{todayStatusLabel}</p>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Attendance History</h3>

                {loading ? (
                    <div>Loading attendance...</div>
                ) : attendance.length === 0 ? (
                    <div className="text-gray-500">No attendance records found.</div>
                ) : (
                    <>
                        <div className="md:hidden space-y-3">
                            {attendance.map((record) => (
                                <article key={record.attendance_id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                                    <p className="text-xs uppercase text-gray-500 font-semibold">Date</p>
                                    <p className="text-sm font-semibold text-gray-800">{formatDate(record.attendance_date)}</p>
                                    <p className="text-xs uppercase text-gray-500 font-semibold mt-2">Time In</p>
                                    <p className="text-sm text-gray-800">{formatDateTime(record.time_in)}</p>
                                    <p className="text-xs uppercase text-gray-500 font-semibold mt-2">Time Out</p>
                                    <p className="text-sm text-gray-800">{formatDateTime(record.time_out)}</p>
                                    <p className="text-xs uppercase text-gray-500 font-semibold mt-2">Status</p>
                                    <p className="text-sm text-gray-800">{record.status}</p>
                                </article>
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[760px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Program</th>
                                        <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Time In</th>
                                        <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Time Out</th>
                                        <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendance.map((record) => (
                                        <tr key={record.attendance_id}>
                                            <td className="px-6 py-4">{formatDate(record.attendance_date)}</td>
                                            <td className="px-6 py-4">{record.program_type || '-'}</td>
                                            <td className="px-6 py-4">{formatDateTime(record.time_in)}</td>
                                            <td className="px-6 py-4">{formatDateTime(record.time_out)}</td>
                                            <td className="px-6 py-4">{record.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Attendance;
