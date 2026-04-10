import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../../api/config';
import { getMyPayouts, type BeneficiaryPayout } from '../../api/payroll.api';
import {
    Banknote,
    CheckCircle2,
    Clock,
    Loader2,
    Wallet,
} from "lucide-react";

const formatPeso = (amount: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(amount || 0);

const PROGRAM_LABELS: Record<string, string> = {
    tupad: "TUPAD",
    spes: "SPES",
    dilp: "DILP",
    gip: "GIP",
    job_seekers: "Job Seekers",
};
const programLabel = (key: string) => PROGRAM_LABELS[key] || key.toUpperCase();

function BeneficiaryPayment() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [records, setRecords] = useState<BeneficiaryPayout[]>([]);
    const [totalPayout, setTotalPayout] = useState(0);
    const [totalDays, setTotalDays] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

            if (!token || role !== 'beneficiary') {
                navigate('/login');
                return;
            }

            try {
                const [profileRes, payoutRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/auth/getProfile`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    getMyPayouts(),
                ]);
                setUser(profileRes.data);
                setRecords(payoutRes.records);
                setTotalPayout(payoutRes.totals.total_payout);
                setTotalDays(payoutRes.totals.total_days);
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Failed to load payment data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const releasedTotal = records.filter((r) => r.status === "Released").reduce((a, r) => a + r.total_payout, 0);
    const pendingTotal = records.filter((r) => r.status !== "Released").reduce((a, r) => a + r.total_payout, 0);

    const statusBadge = (status: string) => {
        if (status === "Released") return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (status === "Approved") return "bg-blue-50 text-blue-700 border-blue-200";
        return "bg-amber-50 text-amber-700 border-amber-200";
    };

    return (
        <section className="w-full max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 sm:p-6">
                <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                    My Payments
                </p>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Payment &amp; Payout History</h1>
                <p className="text-sm text-slate-600 mt-1">
                    {user ? `Welcome, ${user.user_name}. ` : ""}View your payout records across all programs.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> Loading payment data…
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet size={16} className="text-slate-500" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Earned</p>
                            </div>
                            <p className="text-2xl font-semibold text-slate-900">{formatPeso(totalPayout)}</p>
                            <p className="text-xs text-slate-500 mt-1">{totalDays} total days worked</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Released</p>
                            </div>
                            <p className="text-2xl font-semibold text-emerald-900">{formatPeso(releasedTotal)}</p>
                            <p className="text-xs text-emerald-600 mt-1">{records.filter((r) => r.status === "Released").length} payouts released</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-amber-600" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending / Approved</p>
                            </div>
                            <p className="text-2xl font-semibold text-amber-900">{formatPeso(pendingTotal)}</p>
                            <p className="text-xs text-amber-600 mt-1">{records.filter((r) => r.status !== "Released").length} payouts in processing</p>
                        </div>
                    </div>

                    {/* Records Table */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Banknote size={18} className="text-slate-500" />
                                <h2 className="text-lg font-semibold text-slate-900">Payout Records</h2>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Monthly breakdown of your payroll across all programs.</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Month</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Program</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Days Worked</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Daily Wage</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Total Payout</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {records.map((r) => {
                                        const monthLabel = new Date(r.payroll_month + "-01").toLocaleDateString("en-PH", { month: "short", year: "numeric" });
                                        return (
                                            <tr key={r.payroll_id} className="hover:bg-slate-50/70">
                                                <td className="px-5 py-3 font-medium text-slate-800">{monthLabel}</td>
                                                <td className="px-5 py-3">
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{programLabel(r.program_type)}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right text-slate-700">{r.days_worked}</td>
                                                <td className="px-5 py-3 text-right text-slate-700">{formatPeso(r.daily_wage)}</td>
                                                <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatPeso(r.total_payout)}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(r.status)}`}>
                                                        {r.status === "Released" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {records.length === 0 && (
                                        <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No payout records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

export default BeneficiaryPayment;