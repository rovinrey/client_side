import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from '../../../api/config';
import {
    Banknote,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    Clock,
    Download,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Smartphone,
    Wallet,
    X
} from "lucide-react";
import {
    generatePayroll,
    getPayroll,
    approvePayroll,
    releasePayroll,
    createDisbursement,
    getDisbursements,
    updateDisbursementStatus,
    type PayrollResponse,
    type Disbursement,
} from '../../../api/payroll.api';

const PROGRAM_LABELS: Record<string, string> = {
    tupad: "TUPAD",
    spes: "SPES",
    dilp: "DILP",
    gip: "GIP",
    job_seekers: "Job Seekers",
};
const programLabel = (key: string) => PROGRAM_LABELS[key] || key.toUpperCase();

const formatPeso = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2
    }).format(amount || 0);

const toMonthInputDefault = () => new Date().toISOString().slice(0, 7);

const buildCsv = (rows: (string | number)[][]) =>
    rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

const downloadCsv = (fileName: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        Pending: "bg-amber-50 text-amber-700 border-amber-200",
        Approved: "bg-blue-50 text-blue-700 border-blue-200",
        Released: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Scheduled: "bg-slate-50 text-slate-700 border-slate-200",
        Processing: "bg-amber-50 text-amber-700 border-amber-200",
        Failed: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status] || "bg-slate-50 text-slate-700 border-slate-200";
};

const KpiCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
);

const PaymentPage = () => {
    const token = localStorage.getItem("token");

    const [month, setMonth] = useState<string>(toMonthInputDefault());
    const [programFilter, setProgramFilter] = useState<string>("all");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [payroll, setPayroll] = useState<PayrollResponse | null>(null);
    const [disbursements, setDisbursements] = useState<Disbursement[]>([]);

    const [editingWage, setEditingWage] = useState(false);
    const [wageInput, setWageInput] = useState("");
    const [savingWage, setSavingWage] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [approving, setApproving] = useState(false);
    const [releasing, setReleasing] = useState(false);

    const [showDisModal, setShowDisModal] = useState(false);
    const [disForm, setDisForm] = useState({
        program_type: "tupad",
        total_amount: "",
        recipient_count: "",
        payment_mode: "Cash" as string,
        scheduled_date: "",
        notes: "",
    });
    const [disCreating, setDisCreating] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const prog = programFilter === "all" ? undefined : programFilter;
            const [payrollRes, disRes] = await Promise.all([
                getPayroll(month, prog),
                getDisbursements(month),
            ]);
            setPayroll(payrollRes);
            setDisbursements(disRes);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load payroll data.");
        } finally {
            setLoading(false);
        }
    }, [month, programFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const reportLabel = useMemo(() => {
        const [y, m] = month.split("-");
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    }, [month]);

    const programs = useMemo(() => {
        if (!payroll?.byProgram) return [];
        return Object.keys(payroll.byProgram);
    }, [payroll]);

    const avgDaysWorked = useMemo(() => {
        if (!payroll?.records?.length) return 0;
        const total = payroll.records.reduce((a, r) => a + r.days_worked, 0);
        return Math.round((total / payroll.records.length) * 10) / 10;
    }, [payroll]);

    const pendingCount = useMemo(() =>
        payroll?.records?.filter((r) => r.status === "Pending").length || 0
    , [payroll]);

    const approvedCount = useMemo(() =>
        payroll?.records?.filter((r) => r.status === "Approved").length || 0
    , [payroll]);

    const releasedCount = useMemo(() =>
        payroll?.records?.filter((r) => r.status === "Released").length || 0
    , [payroll]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generatePayroll(month);
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to generate payroll");
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async () => {
        setApproving(true);
        try {
            const prog = programFilter === "all" ? undefined : programFilter;
            await approvePayroll(month, prog);
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to approve payroll");
        } finally {
            setApproving(false);
        }
    };

    const handleRelease = async () => {
        setReleasing(true);
        try {
            const prog = programFilter === "all" ? undefined : programFilter;
            await releasePayroll(month, prog);
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to release payroll");
        } finally {
            setReleasing(false);
        }
    };

    const openWageEditor = () => {
        setWageInput(String(payroll?.dailyWage || 435));
        setEditingWage(true);
    };

    const saveWage = async () => {
        const parsed = parseFloat(wageInput);
        if (isNaN(parsed) || parsed <= 0) return;
        setSavingWage(true);
        try {
            await axios.put(
                `${API_BASE_URL}/api/forms/settings/daily-wage`,
                { daily_wage: parsed },
                { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );
            setEditingWage(false);
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to update daily wage.");
        } finally {
            setSavingWage(false);
        }
    };

    const exportPayroll = () => {
        if (!payroll) return;
        const rows: (string | number)[][] = [
            ["Payroll Summary", reportLabel],
            ["Daily Wage", payroll.dailyWage],
            [],
            ["Beneficiary", "Program", "Days Worked", "Daily Wage", "Total Payout", "Status"],
        ];
        payroll.records.forEach((r) => {
            rows.push([r.full_name, programLabel(r.program_type), r.days_worked, r.daily_wage, r.total_payout, r.status]);
        });
        rows.push([]);
        rows.push(["TOTAL", "", payroll.totals.days_worked, payroll.dailyWage, payroll.totals.total_payout, ""]);
        downloadCsv(`payroll_${payroll.month}.csv`, buildCsv(rows));
    };

    const handleCreateDisbursement = async () => {
        setDisCreating(true);
        try {
            await createDisbursement({
                program_type: disForm.program_type,
                payroll_month: month,
                total_amount: parseFloat(disForm.total_amount) || 0,
                recipient_count: parseInt(disForm.recipient_count) || 0,
                payment_mode: disForm.payment_mode,
                scheduled_date: disForm.scheduled_date || undefined,
                notes: disForm.notes || undefined,
            });
            setShowDisModal(false);
            setDisForm({ program_type: "tupad", total_amount: "", recipient_count: "", payment_mode: "Cash", scheduled_date: "", notes: "" });
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to create disbursement");
        } finally {
            setDisCreating(false);
        }
    };

    const handleDisbursementStatus = async (id: number, status: string) => {
        try {
            await updateDisbursementStatus(id, status);
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to update status");
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            {/* Header */}
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Payroll Operations
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Payroll &amp; Payout Management</h1>
                        <p className="text-sm text-slate-600 md:text-base">
                            Generate multi-program payroll from attendance, approve, release, and track disbursements.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
                            <Calendar size={14} />
                            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="outline-none bg-transparent" />
                        </label>

                        <div className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
                            <ChevronDown size={14} />
                            <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}
                                className="appearance-none bg-transparent outline-none pr-2 cursor-pointer">
                                <option value="all">All Programs</option>
                                <option value="tupad">TUPAD</option>
                                <option value="spes">SPES</option>
                                <option value="dilp">DILP</option>
                                <option value="gip">GIP</option>
                                <option value="job_seekers">Job Seekers</option>
                            </select>
                        </div>

                        <button onClick={handleGenerate} disabled={generating}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                            {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Generate Payroll
                        </button>

                        <button onClick={exportPayroll} disabled={!payroll || loading}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>
            </section>

            {/* KPI Cards */}
            <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <KpiCard label="Payroll Total" value={formatPeso(payroll?.totals?.total_payout || 0)} sub="All programs combined" />
                <KpiCard label="Beneficiaries" value={String(payroll?.records?.length || 0)} sub="In current payroll" />
                <KpiCard label="Avg. Days" value={String(avgDaysWorked)} sub="Per beneficiary" />
                <KpiCard label="Period" value={reportLabel} sub="Selected month" />
                <KpiCard label="Programs" value={String(programs.length)} sub="With active payroll" />
            </section>

            {/* Program Breakdown */}
            {payroll?.byProgram && Object.keys(payroll.byProgram).length > 0 && (
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {Object.entries(payroll.byProgram).map(([key, val]) => (
                        <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{programLabel(key)}</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{formatPeso(val.total_payout)}</p>
                            <p className="text-[11px] text-slate-500">{val.count} beneficiaries · {val.days_worked} days</p>
                        </div>
                    ))}
                </section>
            )}

            {/* Payroll Records Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Payroll Records</h2>
                        <p className="text-sm text-slate-500">
                            {reportLabel} · Formula: Days × {formatPeso(payroll?.dailyWage || 435)}
                            {pendingCount > 0 && <span className="ml-2 text-amber-600 font-semibold">({pendingCount} pending)</span>}
                            {approvedCount > 0 && <span className="ml-2 text-blue-600 font-semibold">({approvedCount} approved)</span>}
                            {releasedCount > 0 && <span className="ml-2 text-emerald-600 font-semibold">({releasedCount} released)</span>}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {editingWage ? (
                            <div className="inline-flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-600">₱</span>
                                <input type="number" min="1" step="0.01" value={wageInput}
                                    onChange={(e) => setWageInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveWage(); if (e.key === "Escape") setEditingWage(false); }}
                                    className="w-28 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                                    autoFocus disabled={savingWage} />
                                <button onClick={saveWage} disabled={savingWage} className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"><Check size={14} /></button>
                                <button onClick={() => setEditingWage(false)} disabled={savingWage} className="rounded-lg bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300"><X size={14} /></button>
                            </div>
                        ) : (
                            <button onClick={openWageEditor}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer">
                                <Wallet size={14} /> Daily Wage: {formatPeso(payroll?.dailyWage || 435)} <Pencil size={12} className="text-amber-600" />
                            </button>
                        )}

                        {pendingCount > 0 && (
                            <button onClick={handleApprove} disabled={approving}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                {approving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve All
                            </button>
                        )}
                        {approvedCount > 0 && (
                            <button onClick={handleRelease} disabled={releasing}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                                {releasing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Release All
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading payroll…</div>
                ) : error ? (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><CircleAlert size={16} className="mt-0.5" /><span>{error}</span></div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Beneficiary</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Program</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Days</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Daily Wage</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Total Payout</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payroll?.records?.map((r) => (
                                    <tr key={r.payroll_id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-3 font-medium text-slate-800">{r.full_name}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{programLabel(r.program_type)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700">{r.days_worked}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{formatPeso(r.daily_wage)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPeso(r.total_payout)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(r.status)}`}>
                                                {r.status === "Released" ? <CheckCircle2 size={10} /> : r.status === "Approved" ? <Check size={10} /> : <Clock size={10} />}
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!payroll?.records?.length && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No payroll records. Click "Generate Payroll" to compute from attendance.</td></tr>
                                )}
                            </tbody>
                            {(payroll?.records?.length ?? 0) > 0 && (
                                <tfoot className="border-t border-slate-200 bg-slate-50">
                                    <tr>
                                        <td className="px-4 py-3 font-semibold text-slate-900">TOTAL</td>
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{payroll?.totals?.days_worked || 0}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPeso(payroll?.dailyWage || 435)}</td>
                                        <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">{formatPeso(payroll?.totals?.total_payout || 0)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </section>

            {/* Disbursement Batch Log */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Disbursement Batch Log</h3>
                        <p className="text-xs text-slate-500">Track source, status, and release details per batch.</p>
                    </div>
                    <button onClick={() => setShowDisModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800">
                        <Plus size={14} /> New Batch
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-100 bg-slate-50">
                            <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                <th className="px-6 py-4">Batch</th>
                                <th className="px-6 py-4">Program</th>
                                <th className="px-6 py-4">Mode</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Recipients</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Ref</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {disbursements.map((d) => (
                                <tr key={d.disbursement_id} className="hover:bg-slate-50/70">
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-900">{d.batch_code}</span>
                                        <span className="block text-[10px] text-slate-400">{d.payroll_month}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-700">{programLabel(d.program_type)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${d.payment_mode === "GCash" ? "text-teal-600" : d.payment_mode === "Bank Transfer" ? "text-blue-600" : "text-emerald-600"}`}>
                                            {d.payment_mode === "GCash" ? <Smartphone size={14} /> : <Banknote size={14} />}
                                            {d.payment_mode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatPeso(d.total_amount)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{d.recipient_count}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(d.status)}`}>
                                            {d.status === "Released" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{d.reference_number || "—"}</code>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {d.status === "Scheduled" && (
                                            <button onClick={() => handleDisbursementStatus(d.disbursement_id, "Processing")}
                                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600">Process</button>
                                        )}
                                        {d.status === "Processing" && (
                                            <button onClick={() => handleDisbursementStatus(d.disbursement_id, "Released")}
                                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Release</button>
                                        )}
                                        {d.status === "Released" && (
                                            <span className="text-xs font-medium text-emerald-600">Done</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {disbursements.length === 0 && (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No disbursement batches yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* New Disbursement Modal */}
            {showDisModal && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowDisModal(false)} />
                    <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Create Disbursement Batch</h3>
                            <button onClick={() => setShowDisModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Program</label>
                                <select value={disForm.program_type} onChange={(e) => setDisForm({ ...disForm, program_type: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400">
                                    <option value="tupad">TUPAD</option>
                                    <option value="spes">SPES</option>
                                    <option value="dilp">DILP</option>
                                    <option value="gip">GIP</option>
                                    <option value="job_seekers">Job Seekers</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Total Amount (₱)</label>
                                    <input type="number" min="0" value={disForm.total_amount} onChange={(e) => setDisForm({ ...disForm, total_amount: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Recipients</label>
                                    <input type="number" min="0" value={disForm.recipient_count} onChange={(e) => setDisForm({ ...disForm, recipient_count: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
                                    <select value={disForm.payment_mode} onChange={(e) => setDisForm({ ...disForm, payment_mode: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400">
                                        <option value="Cash">Cash</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Scheduled Date</label>
                                    <input type="date" value={disForm.scheduled_date} onChange={(e) => setDisForm({ ...disForm, scheduled_date: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Notes</label>
                                <textarea value={disForm.notes} onChange={(e) => setDisForm({ ...disForm, notes: e.target.value })} rows={2}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-400" />
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setShowDisModal(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button onClick={handleCreateDisbursement} disabled={disCreating}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                                {disCreating ? "Creating…" : "Create Batch"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PaymentPage;