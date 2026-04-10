import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from '../../../api/config';
import {
    BarChart3,
    Calendar,
    CircleAlert,
    Download,
    FileSpreadsheet,
    Loader2,
    Printer,
    TrendingUp,
    UserCheck,
    Users,
} from "lucide-react";
import {
    getAnalytics,
    getPayroll,
    type AnalyticsResponse,
    type PayrollResponse,
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

const formatDate = (value: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
};

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

// ── Simple bar component ─────────────────────────────

const Bar = ({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
};

type TabKey = "analytics" | "sprs" | "annexd";

// ══════════════════════════════════════════════════════

const Reports = () => {
    const token = localStorage.getItem("token");

    const [month, setMonth] = useState<string>(toMonthInputDefault());
    const [tab, setTab] = useState<TabKey>("analytics");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [payroll, setPayroll] = useState<PayrollResponse | null>(null);

    // SPRS data still comes from old endpoint
    const [sprs, setSprs] = useState<any>(null);
    const [beneficiaryProfile, setBeneficiaryProfile] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [analyticsRes, payrollRes, reportRes] = await Promise.all([
                getAnalytics(month),
                getPayroll(month),
                axios.get(`${API_BASE_URL}/api/forms/reports/tupad-monthly`, {
                    params: { month },
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }).then((r) => r.data).catch(() => null),
            ]);
            setAnalytics(analyticsRes);
            setPayroll(payrollRes);
            if (reportRes) {
                setSprs(reportRes.sprs);
                setBeneficiaryProfile(reportRes.beneficiaryProfile || []);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load report data.");
        } finally {
            setLoading(false);
        }
    }, [month, token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const reportLabel = useMemo(() => {
        const [y, m] = month.split("-");
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    }, [month]);

    // ── Export helpers ────────────────────────────────

    const exportAnnexD = () => {
        if (!beneficiaryProfile.length) return;
        const rows: (string | number)[][] = [
            ["TUPAD Beneficiary Profile (Annex D)", reportLabel],
            [],
            ["Full Name", "Address", "Birthdate", "Gender"],
        ];
        beneficiaryProfile.forEach((row: any) => {
            rows.push([row.full_name || "N/A", row.address || "N/A", formatDate(row.birth_date), row.gender || "N/A"]);
        });
        downloadCsv(`annex_d_${month}.csv`, buildCsv(rows));
    };

    const exportAnalytics = () => {
        if (!analytics) return;
        const rows: (string | number)[][] = [
            ["Analytics Report", reportLabel],
            [],
            ["Program Breakdown"],
            ["Program", "Beneficiaries", "Total Days", "Total Payout", "Avg Days", "Avg Payout"],
        ];
        analytics.programBreakdown.forEach((p) => {
            rows.push([programLabel(p.program_type), p.beneficiary_count, p.total_days, p.total_payout, p.avg_days_worked, p.avg_payout]);
        });
        rows.push([], ["Monthly Trend"], ["Month", "Payout", "Days", "Beneficiaries"]);
        analytics.monthlyTrend.forEach((t) => {
            rows.push([t.payroll_month, t.total_payout, t.total_days, t.beneficiary_count]);
        });
        rows.push([], ["Gender Breakdown"], ["Gender", "Count", "Total Payout"]);
        analytics.genderBreakdown.forEach((g) => {
            rows.push([g.gender || "Unknown", g.count, g.total_payout]);
        });
        downloadCsv(`analytics_${month}.csv`, buildCsv(rows));
    };

    // ── Derived ──────────────────────────────────────

    const maxTrend = useMemo(() => {
        if (!analytics?.monthlyTrend?.length) return 1;
        return Math.max(...analytics.monthlyTrend.map((t) => t.total_payout), 1);
    }, [analytics]);

    const maxProgram = useMemo(() => {
        if (!analytics?.programBreakdown?.length) return 1;
        return Math.max(...analytics.programBreakdown.map((p) => p.total_payout), 1);
    }, [analytics]);

    const totalPayout = useMemo(() => payroll?.totals?.total_payout || 0, [payroll]);
    const totalBeneficiaries = useMemo(() => payroll?.records?.length || 0, [payroll]);

    const programColors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
    const genderColors = ["bg-blue-500", "bg-pink-500", "bg-slate-400"];

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: "analytics", label: "Data Analytics", icon: <BarChart3 size={14} /> },
        { key: "sprs", label: "SPRS Summary", icon: <Users size={14} /> },
        { key: "annexd", label: "Annex D", icon: <FileSpreadsheet size={14} /> },
    ];

    // ══════════════════════════════════════════════════

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 print:space-y-4">
            {/* Header */}
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 md:p-6 print:hidden">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Reports &amp; Analytics
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                            Data Analytics &amp; Report Generation
                        </h1>
                        <p className="text-sm text-slate-600 md:text-base">
                            Multi-program analytics, trend visualization, SPRS summary, and Annex D — all in one place.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                            <Calendar size={16} className="text-slate-500" />
                            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent font-semibold text-slate-800 outline-none" />
                        </label>

                        <button onClick={exportAnalytics} disabled={!analytics || loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
                            <Download size={16} /> Export
                        </button>

                        <button onClick={exportAnnexD} disabled={!beneficiaryProfile.length || loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
                            <FileSpreadsheet size={16} /> Annex D
                        </button>

                        <button onClick={() => window.print()} disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
                            <Printer size={16} /> Print
                        </button>
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 print:hidden">
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading report data…</div>
            ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                    <div className="flex items-start gap-3"><CircleAlert size={18} className="mt-0.5" /><div><p className="font-semibold">Unable to load report</p><p className="text-sm">{error}</p></div></div>
                </div>
            ) : (
                <>
                    {/* ════ Analytics Tab ════ */}
                    {tab === "analytics" && analytics && (
                        <div className="space-y-6">
                            {/* KPI strip */}
                            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <KpiCard label="Total Payout" value={formatPeso(totalPayout)} sub={reportLabel} />
                                <KpiCard label="Beneficiaries" value={String(totalBeneficiaries)} sub="In payroll" />
                                <KpiCard label="Programs Active" value={String(analytics.programBreakdown.length)} sub="With records" />
                                <KpiCard label="Trend Months" value={String(analytics.monthlyTrend.length)} sub="Data points" />
                            </section>

                            {/* Monthly Trend */}
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-emerald-600" />
                                    <h2 className="text-lg font-semibold text-slate-900">Monthly Payout Trend</h2>
                                </div>
                                {analytics.monthlyTrend.length > 0 ? (
                                    <div className="space-y-3">
                                        {analytics.monthlyTrend.map((t) => {
                                            const label = new Date(t.payroll_month + "-01").toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
                                            return (
                                                <div key={t.payroll_month} className="flex items-center gap-3">
                                                    <span className="w-20 text-xs font-semibold text-slate-600 text-right">{label}</span>
                                                    <div className="flex-1"><Bar value={t.total_payout} max={maxTrend} color="bg-emerald-500" /></div>
                                                    <span className="w-28 text-right text-xs font-semibold text-slate-700">{formatPeso(t.total_payout)}</span>
                                                    <span className="w-16 text-right text-[10px] text-slate-500">{t.beneficiary_count} pax</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No trend data available yet.</p>
                                )}
                            </section>

                            {/* Program Breakdown + Gender */}
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Program Breakdown */}
                                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="mb-4 flex items-center gap-2">
                                        <BarChart3 size={18} className="text-blue-600" />
                                        <h2 className="text-lg font-semibold text-slate-900">Program Breakdown</h2>
                                    </div>
                                    {analytics.programBreakdown.length > 0 ? (
                                        <div className="space-y-4">
                                            {analytics.programBreakdown.map((p, idx) => (
                                                <div key={p.program_type}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{programLabel(p.program_type)}</span>
                                                        <span className="text-xs font-semibold text-slate-700">{formatPeso(p.total_payout)}</span>
                                                    </div>
                                                    <Bar value={p.total_payout} max={maxProgram} color={programColors[idx % programColors.length]} />
                                                    <p className="mt-1 text-[10px] text-slate-500">{p.beneficiary_count} beneficiaries · {p.total_days} days · Avg {formatPeso(p.avg_payout)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No program data yet.</p>
                                    )}
                                </section>

                                {/* Gender Breakdown + Disbursement Summary */}
                                <div className="space-y-6">
                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h3 className="mb-3 text-sm font-semibold text-slate-900">Gender Distribution</h3>
                                        {analytics.genderBreakdown.length > 0 ? (
                                            <div className="space-y-3">
                                                {analytics.genderBreakdown.map((g, idx) => {
                                                    const maxG = Math.max(...analytics.genderBreakdown.map((x) => x.count), 1);
                                                    return (
                                                        <div key={g.gender || "unknown"} className="flex items-center gap-3">
                                                            <span className="w-16 text-xs font-semibold text-slate-600">{g.gender || "Unknown"}</span>
                                                            <div className="flex-1"><Bar value={g.count} max={maxG} color={genderColors[idx % genderColors.length]} /></div>
                                                            <span className="w-10 text-right text-xs font-bold text-slate-700">{g.count}</span>
                                                            <span className="w-24 text-right text-xs text-slate-500">{formatPeso(g.total_payout)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500">No gender data.</p>
                                        )}
                                    </section>

                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h3 className="mb-3 text-sm font-semibold text-slate-900">Disbursement Summary</h3>
                                        {analytics.disbursementSummary.length > 0 ? (
                                            <div className="space-y-2">
                                                {analytics.disbursementSummary.map((d) => (
                                                    <div key={d.status} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                        <span className="text-xs font-bold text-slate-700">{d.status}</span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-semibold text-slate-900">{formatPeso(d.total_amount)}</span>
                                                            <span className="ml-2 text-[10px] text-slate-500">{d.count} batches · {d.total_recipients} pax</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500">No disbursements yet.</p>
                                        )}
                                    </section>

                                    {/* Attendance Stats */}
                                    {analytics.attendanceStats.length > 0 && (
                                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                            <h3 className="mb-3 text-sm font-semibold text-slate-900">Attendance Stats</h3>
                                            <div className="flex gap-3 flex-wrap">
                                                {analytics.attendanceStats.map((a) => (
                                                    <div key={a.status} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center min-w-[100px]">
                                                        <p className="text-lg font-bold text-slate-900">{a.count}</p>
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{a.status}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>

                            {/* Application Counts */}
                            {analytics.applicationCounts.length > 0 && (
                                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <h3 className="mb-4 text-sm font-semibold text-slate-900">Applications by Program &amp; Status</h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead className="border-b border-slate-200 bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Program</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Status</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Count</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {analytics.applicationCounts.map((a, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/70">
                                                        <td className="px-4 py-2 text-slate-700">{programLabel(a.program_type)}</td>
                                                        <td className="px-4 py-2 text-slate-600">{a.status}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-slate-900">{a.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* ════ SPRS Tab ════ */}
                    {tab === "sprs" && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">SPRS Summary</h2>
                                    <p className="text-sm text-slate-500">Reporting period: {reportLabel}</p>
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statistical Performance Reporting System</p>
                            </div>
                            {sprs ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <MetricCard icon={<Users size={16} />} tone="teal" label="Applicants Registered (Male)" value={sprs.applicantsRegistered?.male || 0} />
                                    <MetricCard icon={<Users size={16} />} tone="violet" label="Applicants Registered (Female)" value={sprs.applicantsRegistered?.female || 0} />
                                    <MetricCard icon={<Users size={16} />} tone="slate" label="Applicants Registered (Total)" value={sprs.applicantsRegistered?.total || 0} />
                                    <MetricCard icon={<UserCheck size={16} />} tone="emerald" label="Placements / Assisted" value={sprs.placementsAssisted || 0} />
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">SPRS data not available for this period.</p>
                            )}
                        </section>
                    )}

                    {/* ════ Annex D Tab ════ */}
                    {tab === "annexd" && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">TUPAD Beneficiary Profile (Annex D)</h2>
                                    <p className="text-sm text-slate-500">Current approved batch for TUPAD.</p>
                                </div>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                                    {beneficiaryProfile.length} beneficiaries
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full min-w-[680px] text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Address</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Birthdate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {beneficiaryProfile.map((row: any) => (
                                            <tr key={`${row.application_id}-${row.user_id}`} className="hover:bg-slate-50/70">
                                                <td className="px-4 py-3 font-medium text-slate-800">{row.full_name || "N/A"}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.address || "N/A"}</td>
                                                <td className="px-4 py-3 text-slate-700">{formatDate(row.birth_date)}</td>
                                            </tr>
                                        ))}
                                        {beneficiaryProfile.length === 0 && (
                                            <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No approved TUPAD beneficiaries for this period.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

// ── Sub-components ───────────────────────────────────

const KpiCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
);

type MetricCardProps = {
    icon: React.ReactNode;
    tone: "teal" | "violet" | "slate" | "emerald";
    label: string;
    value: number;
};

const MetricCard = ({ icon, tone, label, value }: MetricCardProps) => {
    const tones = {
        teal: "border-teal-200 bg-teal-50 text-teal-700",
        violet: "border-violet-200 bg-violet-50 text-violet-700",
        slate: "border-slate-200 bg-slate-50 text-slate-700",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-700"
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${tones[tone]}`}>
                    {icon}
                </span>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{value}</p>
        </div>
    );
};

export default Reports;