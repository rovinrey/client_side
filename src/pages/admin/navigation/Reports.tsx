import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    Briefcase,
    Calendar,
    CalendarCheck,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    ClipboardList,
    Download,
    GraduationCap,
    Loader2,
    Printer,
    TrendingUp,
    UserCheck,
    Users,
    Wallet,
} from "lucide-react";
import {
    getAnalytics,
    getPayroll,
    type AnalyticsResponse,
    type PayrollResponse,
} from '../../../api/payroll.api';
import {
    getProgramAccomplishment,
    getBeneficiaryMasterList,
    getPayrollSummary,
    getAttendanceSummary,
    getDilpMonitoring,
    getEmploymentFacilitation,
    getSpesReport,
    getGipReport,
    getConsolidatedReport,
    exportProgramAccomplishment,
    exportBeneficiaryMasterList,
    exportPayrollSummary,
    exportAttendanceSummary,
    exportDilpMonitoring,
    exportEmploymentFacilitation,
    exportSpesReport,
    exportGipReport,
    exportConsolidatedReport,
    type ProgramAccomplishmentResponse,
    type BeneficiaryMasterListResponse,
    type PayrollSummaryResponse,
    type AttendanceSummaryResponse,
    type DilpMonitoringResponse,
    type EmploymentFacilitationResponse,
    type SpesReportResponse,
    type GipReportResponse,
    type ConsolidatedReportResponse,
} from '../../../api/reports.api';

// ── Helpers ──────────────────────────────────────────

const PROGRAM_LABELS: Record<string, string> = { tupad: "TUPAD", spes: "SPES", dilp: "DILP", gip: "GIP", job_seekers: "Job Seekers" };
const programLabel = (key: string) => PROGRAM_LABELS[key] || key.toUpperCase();
const formatPeso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(n || 0);
const formatDate = (v: string | null) => { if (!v) return "N/A"; const d = new Date(v); return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }); };
const toMonthDefault = () => new Date().toISOString().slice(0, 7);
const safe = (n: number | undefined | null) => n ?? 0;
const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) : "0.0");

// ── Tiny bar chart ───────────────────────────────────

const Bar = ({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) => (
    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }} />
    </div>
);

// ── Section IDs ──────────────────────────────────────

type SectionId = "accomplishment" | "masterlist" | "payroll" | "attendance" | "dilp" | "employment" | "spes" | "gip" | "consolidated";

// ══════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════════════

const Reports = () => {
    // ── Controls ─────────────────────────────────────
    const [month, setMonth] = useState(toMonthDefault());
    const [endMonth, setEndMonth] = useState(toMonthDefault());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);

    // Expanded sections — default: all collapsed (just KPI cards visible)
    const [expanded, setExpanded] = useState<Set<SectionId>>(new Set());
    const toggle = (id: SectionId) => setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    const isOpen = (id: SectionId) => expanded.has(id);

    // ── Data stores ──────────────────────────────────
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [payrollLegacy, setPayrollLegacy] = useState<PayrollResponse | null>(null);
    const [accomplishment, setAccomplishment] = useState<ProgramAccomplishmentResponse | null>(null);
    const [masterlist, setMasterlist] = useState<BeneficiaryMasterListResponse | null>(null);
    const [payrollReport, setPayrollReport] = useState<PayrollSummaryResponse | null>(null);
    const [attendanceReport, setAttendanceReport] = useState<AttendanceSummaryResponse | null>(null);
    const [dilpReport, setDilpReport] = useState<DilpMonitoringResponse | null>(null);
    const [employmentReport, setEmploymentReport] = useState<EmploymentFacilitationResponse | null>(null);
    const [spesData, setSpesData] = useState<SpesReportResponse | null>(null);
    const [gipData, setGipData] = useState<GipReportResponse | null>(null);
    const [consolidated, setConsolidated] = useState<ConsolidatedReportResponse | null>(null);

    // ── Parallel fetch ALL data at once ──────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const results = await Promise.allSettled([
                getAnalytics(month),                        // 0
                getPayroll(month),                          // 1
                getProgramAccomplishment(month),            // 2
                getBeneficiaryMasterList(),                 // 3
                getPayrollSummary(month),                   // 4
                getAttendanceSummary(month),                // 5
                getDilpMonitoring(month),                   // 6
                getEmploymentFacilitation(month),           // 7
                getSpesReport(month),                       // 8
                getGipReport(month),                        // 9
                getConsolidatedReport(month, endMonth),     // 10
            ]);
            const v = <T,>(i: number): T | null => results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<T>).value : null;
            setAnalytics(v<AnalyticsResponse>(0));
            setPayrollLegacy(v<PayrollResponse>(1));
            setAccomplishment(v<ProgramAccomplishmentResponse>(2));
            setMasterlist(v<BeneficiaryMasterListResponse>(3));
            setPayrollReport(v<PayrollSummaryResponse>(4));
            setAttendanceReport(v<AttendanceSummaryResponse>(5));
            setDilpReport(v<DilpMonitoringResponse>(6));
            setEmploymentReport(v<EmploymentFacilitationResponse>(7));
            setSpesData(v<SpesReportResponse>(8));
            setGipData(v<GipReportResponse>(9));
            setConsolidated(v<ConsolidatedReportResponse>(10));
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, [month, endMonth]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const reportLabel = useMemo(() => {
        const [y, m] = month.split("-");
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    }, [month]);

    // ── Per-section export (no tab needed) ───────────
    const handleExport = async (id: SectionId) => {
        setExportingId(id);
        try {
            if (id === "accomplishment") await exportProgramAccomplishment(month);
            else if (id === "masterlist") await exportBeneficiaryMasterList();
            else if (id === "payroll") await exportPayrollSummary(month);
            else if (id === "attendance") await exportAttendanceSummary(month);
            else if (id === "dilp") await exportDilpMonitoring(month);
            else if (id === "employment") await exportEmploymentFacilitation(month);
            else if (id === "spes") await exportSpesReport(month);
            else if (id === "gip") await exportGipReport(month);
            else if (id === "consolidated") await exportConsolidatedReport(month, endMonth);
        } catch { setError("Export failed. Please try again."); }
        finally { setExportingId(null); }
    };

    // ── Derived analytics values ─────────────────────
    const maxTrend = useMemo(() => analytics?.monthlyTrend?.length ? Math.max(...analytics.monthlyTrend.map((t) => t.total_payout), 1) : 1, [analytics]);
    const maxProgram = useMemo(() => analytics?.programBreakdown?.length ? Math.max(...analytics.programBreakdown.map((p) => p.total_payout), 1) : 1, [analytics]);
    const totalPayout = payrollLegacy?.totals?.total_payout || 0;
    const totalBeneficiaries = payrollLegacy?.records?.length || 0;
    const programColors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
    const genderColors = ["bg-blue-500", "bg-pink-500", "bg-slate-400"];

    // ══════════════════════════════════════════════════
    // ██  RENDER
    // ══════════════════════════════════════════════════

    return (
        <div className="mx-auto w-full max-w-7xl space-y-5 print:space-y-4">

            {/* ── Sticky Header Bar ─────────────────── */}
            <section className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 md:p-5 shadow-sm print:static print:shadow-none">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">PESO Juban — Reports</h1>
                        <p className="text-xs text-slate-500 mt-0.5">All reports for <span className="font-semibold text-slate-700">{reportLabel}</span> · Click any section to expand details</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <Calendar size={15} className="text-slate-400" />
                            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent font-semibold text-slate-800 outline-none w-32" />
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400">to</span>
                            <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="bg-transparent font-semibold text-slate-800 outline-none w-32" />
                        </label>
                        <button onClick={() => window.print()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                            <Printer size={14} /> Print
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Loading / Error ──────────────────── */}
            {loading && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
                    <Loader2 size={18} className="animate-spin" /> Loading all reports…
                </div>
            )}
            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                    <div className="flex items-start gap-3"><CircleAlert size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Report Error</p><p className="text-sm">{error}</p></div></div>
                </div>
            )}

            {!loading && (
                <>
                    {/* ━━━━ OVERVIEW KPI STRIP ━━━━━━━━━ */}
                    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                        <KpiCard label="Total Payout" value={formatPeso(totalPayout)} sub={reportLabel} accent="emerald" />
                        <KpiCard label="Beneficiaries" value={String(masterlist?.demographics?.total ?? totalBeneficiaries)} sub="All programs" accent="blue" />
                        <KpiCard label="Budget Utilization" value={`${safe(accomplishment?.totals?.utilization_rate).toFixed(0)}%`} sub={formatPeso(safe(accomplishment?.totals?.used))} accent="violet" />
                        <KpiCard label="Attendance Compliance" value={`${safe(attendanceReport?.totals?.compliance_rate).toFixed(0)}%`} sub={`${safe(attendanceReport?.totals?.present_days)} present days`} accent="amber" />
                        <KpiCard label="DILP Projects" value={String(dilpReport?.summary?.total_projects ?? 0)} sub={formatPeso(safe(dilpReport?.summary?.total_proposed_amount))} accent="rose" />
                    </section>

                    {/* ━━━━ ANALYTICS DASHBOARD ━━━━━━━━ */}
                    {analytics && (
                        <div className="space-y-5">
                            {/* Trend + Breakdown side by side */}
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /><h2 className="text-sm font-semibold text-slate-900">Monthly Payout Trend</h2></div>
                                    {analytics.monthlyTrend.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {analytics.monthlyTrend.map((t) => (
                                                <div key={t.payroll_month} className="flex items-center gap-2.5">
                                                    <span className="w-16 text-right text-[11px] font-semibold text-slate-500">{new Date(t.payroll_month + "-01").toLocaleDateString("en-PH", { month: "short", year: "2-digit" })}</span>
                                                    <div className="flex-1"><Bar value={t.total_payout} max={maxTrend} /></div>
                                                    <span className="w-24 text-right text-[11px] font-semibold text-slate-700">{formatPeso(t.total_payout)}</span>
                                                    <span className="w-12 text-right text-[10px] text-slate-400">{t.beneficiary_count} pax</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-slate-400">No trend data yet.</p>}
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-blue-600" /><h2 className="text-sm font-semibold text-slate-900">Program Breakdown</h2></div>
                                    {analytics.programBreakdown.length > 0 ? (
                                        <div className="space-y-3">
                                            {analytics.programBreakdown.map((p, i) => (
                                                <div key={p.program_type}>
                                                    <div className="flex justify-between mb-0.5"><span className="text-[11px] font-bold uppercase text-slate-600">{programLabel(p.program_type)}</span><span className="text-[11px] font-semibold text-slate-700">{formatPeso(p.total_payout)}</span></div>
                                                    <Bar value={p.total_payout} max={maxProgram} color={programColors[i % programColors.length]} />
                                                    <p className="mt-0.5 text-[10px] text-slate-400">{p.beneficiary_count} pax · {p.total_days} days · Avg {formatPeso(p.avg_payout)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-slate-400">No program data.</p>}
                                </section>
                            </div>

                            {/* Gender + Disbursement + Attendance + Applications */}
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Gender Distribution</h3>
                                    {analytics.genderBreakdown.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {analytics.genderBreakdown.map((g, i) => {
                                                const mx = Math.max(...analytics.genderBreakdown.map((x) => x.count), 1);
                                                return (
                                                    <div key={g.gender || "unknown"} className="flex items-center gap-2">
                                                        <span className="w-14 text-[11px] font-semibold text-slate-600">{g.gender || "N/A"}</span>
                                                        <div className="flex-1"><Bar value={g.count} max={mx} color={genderColors[i % genderColors.length]} /></div>
                                                        <span className="w-8 text-right text-[11px] font-bold text-slate-700">{g.count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : <p className="text-xs text-slate-400">No gender data.</p>}
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Disbursements</h3>
                                    {analytics.disbursementSummary.length > 0 ? (
                                        <div className="space-y-2">
                                            {analytics.disbursementSummary.map((d) => (
                                                <div key={d.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                    <span className="text-[11px] font-bold text-slate-700">{d.status}</span>
                                                    <span className="text-[11px] font-semibold text-slate-900">{formatPeso(d.total_amount)} <span className="text-slate-400">· {d.count} batches</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-slate-400">No disbursements.</p>}
                                </section>

                                {analytics.attendanceStats.length > 0 && (
                                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Attendance</h3>
                                        <div className="flex gap-2 flex-wrap">
                                            {analytics.attendanceStats.map((a) => (
                                                <div key={a.status} className="rounded-lg bg-slate-50 px-3 py-2 text-center min-w-[80px]">
                                                    <p className="text-base font-bold text-slate-900">{a.count}</p>
                                                    <p className="text-[9px] font-semibold uppercase text-slate-400">{a.status}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ━━━━ ACCORDION REPORT SECTIONS ━━ */}

                    {/* 1 · Program Accomplishment */}
                    {accomplishment && (
                        <AccordionSection
                            id="accomplishment" icon={<TrendingUp size={16} />} title="Program Accomplishment"
                            badge={`${accomplishment.totals.program_count} programs`}
                            isOpen={isOpen("accomplishment")} onToggle={() => toggle("accomplishment")}
                            onExport={() => handleExport("accomplishment")} exporting={exportingId === "accomplishment"}
                            kpis={[
                                { label: "Total Budget", value: formatPeso(accomplishment.totals.budget) },
                                { label: "Used", value: formatPeso(accomplishment.totals.used) },
                                { label: "Utilization", value: `${safe(accomplishment.totals.utilization_rate).toFixed(1)}%` },
                                { label: "Slots", value: `${accomplishment.totals.filled}/${accomplishment.totals.slots}` },
                            ]}
                        >
                            <DataTable
                                headers={["Program", "Budget", "Used", "Remaining", "Util %", "Slots", "Filled", "Fill %", "Status"]}
                                rows={accomplishment.programs.map((p) => [
                                    p.program_name, formatPeso(p.budget), formatPeso(p.used), formatPeso(p.remaining),
                                    safe(p.utilization_rate).toFixed(1) + "%", p.slots, p.filled, safe(p.slot_rate).toFixed(1) + "%", p.status
                                ])}
                                alignRight={[1, 2, 3, 4, 5, 6, 7]}
                            />
                            {accomplishment.genderByProgram.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">Gender by Program</h4>
                                    <DataTable
                                        headers={["Program", "Gender", "Count"]}
                                        rows={accomplishment.genderByProgram.map((g) => [programLabel(g.program_type), g.gender || "Unknown", g.count])}
                                        alignRight={[2]}
                                    />
                                </div>
                            )}
                        </AccordionSection>
                    )}

                    {/* 2 · Beneficiary Master List */}
                    {masterlist && (
                        <AccordionSection
                            id="masterlist" icon={<Users size={16} />} title="Beneficiary Master List"
                            badge={`${masterlist.demographics.total} beneficiaries`}
                            isOpen={isOpen("masterlist")} onToggle={() => toggle("masterlist")}
                            onExport={() => handleExport("masterlist")} exporting={exportingId === "masterlist"}
                            kpis={[
                                { label: "Total", value: String(masterlist.demographics.total) },
                                { label: "Male", value: `${masterlist.demographics.male} (${pct(masterlist.demographics.male, masterlist.demographics.total)}%)` },
                                { label: "Female", value: `${masterlist.demographics.female} (${pct(masterlist.demographics.female, masterlist.demographics.total)}%)` },
                            ]}
                        >
                            {Object.keys(masterlist.demographics.byProgram).length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">By Program</h4>
                                    <DataTable
                                        headers={["Program", "Total", "Male", "Female"]}
                                        rows={Object.entries(masterlist.demographics.byProgram).map(([prog, d]) => [programLabel(prog), d.total, d.male, d.female])}
                                        alignRight={[1, 2, 3]}
                                    />
                                </div>
                            )}
                            <DataTable
                                headers={["Name", "Program", "Gender", "Age", "Civil Status", "Address", "Status", "Applied"]}
                                rows={masterlist.beneficiaries.map((b) => [
                                    `${b.last_name}, ${b.first_name} ${b.middle_name || ""} ${b.extension_name || ""}`.trim(),
                                    programLabel(b.program_type), b.gender || "N/A", b.age ?? "N/A", b.civil_status || "N/A",
                                    b.address || "N/A", b.application_status, formatDate(b.applied_at)
                                ])}
                            />
                        </AccordionSection>
                    )}

                    {/* 3 · Payroll & Disbursement */}
                    {payrollReport && (
                        <AccordionSection
                            id="payroll" icon={<Wallet size={16} />} title="Payroll & Disbursement"
                            badge={`${payrollReport.totals.beneficiary_count} payees`}
                            isOpen={isOpen("payroll")} onToggle={() => toggle("payroll")}
                            onExport={() => handleExport("payroll")} exporting={exportingId === "payroll"}
                            kpis={[
                                { label: "Total Payout", value: formatPeso(payrollReport.totals.total_payout) },
                                { label: "Days Worked", value: String(payrollReport.totals.total_days) },
                                { label: "Daily Wage", value: formatPeso(payrollReport.dailyWage) },
                                { label: "Disbursed", value: formatPeso(payrollReport.totals.disbursed_amount) },
                            ]}
                        >
                            {payrollReport.byProgram.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">By Program</h4>
                                    <DataTable
                                        headers={["Program", "Status", "Beneficiaries", "Days", "Payout"]}
                                        rows={payrollReport.byProgram.map((r) => [programLabel(r.program_type), r.status, r.beneficiary_count, r.total_days, formatPeso(r.total_payout)])}
                                        alignRight={[2, 3, 4]}
                                    />
                                </div>
                            )}
                            <DataTable
                                headers={["Name", "Program", "Days", "Daily Wage", "Total Payout", "Status"]}
                                rows={payrollReport.records.map((r) => [r.full_name, programLabel(r.program_type), r.days_worked, formatPeso(r.daily_wage), formatPeso(r.total_payout), r.status])}
                                alignRight={[2, 3, 4]}
                            />
                        </AccordionSection>
                    )}

                    {/* 4 · Attendance */}
                    {attendanceReport && (
                        <AccordionSection
                            id="attendance" icon={<CalendarCheck size={16} />} title="Attendance & Compliance"
                            badge={`${safe(attendanceReport.totals.compliance_rate).toFixed(0)}% compliance`}
                            isOpen={isOpen("attendance")} onToggle={() => toggle("attendance")}
                            onExport={() => handleExport("attendance")} exporting={exportingId === "attendance"}
                            kpis={[
                                { label: "Beneficiaries", value: String(attendanceReport.totals.beneficiaries) },
                                { label: "Present", value: String(attendanceReport.totals.present_days) },
                                { label: "Absent", value: String(attendanceReport.totals.absent_days) },
                                { label: "Compliance", value: `${safe(attendanceReport.totals.compliance_rate).toFixed(1)}%` },
                            ]}
                        >
                            <DataTable
                                headers={["Name", "Program", "Present", "Absent", "Incomplete", "Records", "Compliance %"]}
                                rows={attendanceReport.records.map((r) => [
                                    r.full_name, programLabel(r.program_type), r.present_days, r.absent_days, r.incomplete_days, r.total_records,
                                    r.total_records > 0 ? ((r.present_days / r.total_records) * 100).toFixed(1) + "%" : "0%"
                                ])}
                                alignRight={[2, 3, 4, 5, 6]}
                            />
                        </AccordionSection>
                    )}

                    {/* 5 · DILP */}
                    {dilpReport && (
                        <AccordionSection
                            id="dilp" icon={<ClipboardList size={16} />} title="DILP Project Monitoring"
                            badge={`${dilpReport.summary.total_projects} projects`}
                            isOpen={isOpen("dilp")} onToggle={() => toggle("dilp")}
                            onExport={() => handleExport("dilp")} exporting={exportingId === "dilp"}
                            kpis={[
                                { label: "Projects", value: String(dilpReport.summary.total_projects) },
                                { label: "Proposed", value: formatPeso(dilpReport.summary.total_proposed_amount) },
                                { label: "Target Beneficiaries", value: String(dilpReport.summary.total_beneficiaries) },
                            ]}
                        >
                            {dilpReport.summary.byCategory.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">By Category</h4>
                                    <DataTable headers={["Category", "Projects", "Amount"]} rows={dilpReport.summary.byCategory.map((c) => [c.category || "N/A", c.count, formatPeso(c.amount)])} alignRight={[1, 2]} />
                                </div>
                            )}
                            <DataTable
                                headers={["Proponent", "Project", "Type", "Category", "Amount", "Barangay", "Beneficiaries", "Status"]}
                                rows={dilpReport.projects.map((p) => [p.proponent_name, p.project_title, p.project_type, p.category || "N/A", formatPeso(p.proposed_amount), p.barangay || "N/A", p.number_of_beneficiaries, p.application_status])}
                                alignRight={[4, 6]}
                            />
                        </AccordionSection>
                    )}

                    {/* 6 · Employment / Job Seekers */}
                    {employmentReport && (
                        <AccordionSection
                            id="employment" icon={<Briefcase size={16} />} title="Employment Facilitation (Job Seekers)"
                            badge={`${employmentReport.summary.total_registered} registered`}
                            isOpen={isOpen("employment")} onToggle={() => toggle("employment")}
                            onExport={() => handleExport("employment")} exporting={exportingId === "employment"}
                            kpis={[
                                { label: "Registered", value: String(employmentReport.summary.total_registered) },
                                { label: "Male", value: `${employmentReport.summary.male} (${pct(employmentReport.summary.male, employmentReport.summary.total_registered)}%)` },
                                { label: "Female", value: `${employmentReport.summary.female} (${pct(employmentReport.summary.female, employmentReport.summary.total_registered)}%)` },
                            ]}
                        >
                            <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-2">
                                {employmentReport.summary.byWorkType.length > 0 && (
                                    <div>
                                        <h4 className="mb-2 text-xs font-semibold text-slate-600">By Work Type</h4>
                                        <DataTable headers={["Work Type", "Count"]} rows={employmentReport.summary.byWorkType.map((w) => [w.type || "N/A", w.count])} alignRight={[1]} />
                                    </div>
                                )}
                                {employmentReport.summary.byIndustry.length > 0 && (
                                    <div>
                                        <h4 className="mb-2 text-xs font-semibold text-slate-600">By Industry</h4>
                                        <DataTable headers={["Industry", "Count"]} rows={employmentReport.summary.byIndustry.map((i) => [i.industry || "N/A", i.count])} alignRight={[1]} />
                                    </div>
                                )}
                            </div>
                            <DataTable
                                headers={["Name", "Gender", "Age", "Address", "Work Type", "Industry", "Status", "Applied"]}
                                rows={employmentReport.seekers.map((s: any) => [
                                    `${s.last_name || ""}, ${s.first_name || ""} ${s.middle_name || ""}`.trim(),
                                    s.gender || "N/A", s.age ?? "N/A", s.address || "N/A",
                                    s.preferred_work_type || "N/A", s.preferred_industry || "N/A", s.employment_status || "N/A", formatDate(s.applied_at)
                                ])}
                            />
                        </AccordionSection>
                    )}

                    {/* 7 · SPES */}
                    {spesData && (
                        <AccordionSection
                            id="spes" icon={<GraduationCap size={16} />} title="SPES Intern Report"
                            badge={`${spesData.summary.total} interns`}
                            isOpen={isOpen("spes")} onToggle={() => toggle("spes")}
                            onExport={() => handleExport("spes")} exporting={exportingId === "spes"}
                            kpis={[
                                { label: "Total", value: String(spesData.summary.total) },
                                { label: "Male", value: `${spesData.summary.male} (${pct(spesData.summary.male, spesData.summary.total)}%)` },
                                { label: "Female", value: `${spesData.summary.female} (${pct(spesData.summary.female, spesData.summary.total)}%)` },
                            ]}
                        >
                            <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-2">
                                {spesData.summary.byEducation.length > 0 && (
                                    <div><h4 className="mb-2 text-xs font-semibold text-slate-600">By Education</h4><DataTable headers={["Level", "Count"]} rows={spesData.summary.byEducation.map((e) => [e.level || "N/A", e.count])} alignRight={[1]} /></div>
                                )}
                                {spesData.summary.byStudentType.length > 0 && (
                                    <div><h4 className="mb-2 text-xs font-semibold text-slate-600">By Student Type</h4><DataTable headers={["Type", "Count"]} rows={spesData.summary.byStudentType.map((t) => [t.type || "N/A", t.count])} alignRight={[1]} /></div>
                                )}
                            </div>
                            <DataTable
                                headers={["Name", "Gender", "Age", "Education", "Type", "School", "Course", "Status", "Applied"]}
                                rows={spesData.interns.map((s: any) => [
                                    `${s.last_name || ""}, ${s.first_name || ""} ${s.middle_name || ""}`.trim(),
                                    s.gender || "N/A", s.age ?? "N/A", s.education_level || "N/A", s.student_type || "N/A",
                                    s.school_name || "N/A", s.course || "N/A", s.application_status, formatDate(s.applied_at)
                                ])}
                            />
                        </AccordionSection>
                    )}

                    {/* 8 · GIP */}
                    {gipData && (
                        <AccordionSection
                            id="gip" icon={<UserCheck size={16} />} title="GIP Intern Report"
                            badge={`${gipData.summary.total} interns`}
                            isOpen={isOpen("gip")} onToggle={() => toggle("gip")}
                            onExport={() => handleExport("gip")} exporting={exportingId === "gip"}
                            kpis={[
                                { label: "Total", value: String(gipData.summary.total) },
                                { label: "Male", value: `${gipData.summary.male} (${pct(gipData.summary.male, gipData.summary.total)}%)` },
                                { label: "Female", value: `${gipData.summary.female} (${pct(gipData.summary.female, gipData.summary.total)}%)` },
                            ]}
                        >
                            <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-2">
                                {gipData.summary.bySchool.length > 0 && (
                                    <div><h4 className="mb-2 text-xs font-semibold text-slate-600">By School</h4><DataTable headers={["School", "Count"]} rows={gipData.summary.bySchool.map((s) => [s.school || "N/A", s.count])} alignRight={[1]} /></div>
                                )}
                                {gipData.summary.byCourse.length > 0 && (
                                    <div><h4 className="mb-2 text-xs font-semibold text-slate-600">By Course</h4><DataTable headers={["Course", "Count"]} rows={gipData.summary.byCourse.map((c) => [c.course || "N/A", c.count])} alignRight={[1]} /></div>
                                )}
                            </div>
                            <DataTable
                                headers={["Name", "Gender", "Age", "School", "Course", "Year Graduated", "Status", "Applied"]}
                                rows={gipData.interns.map((g: any) => [
                                    `${g.last_name || ""}, ${g.first_name || ""} ${g.middle_name || ""}`.trim(),
                                    g.gender || "N/A", g.age ?? "N/A", g.school || "N/A", g.course || "N/A",
                                    g.year_graduated || "N/A", g.application_status, formatDate(g.applied_at)
                                ])}
                            />
                        </AccordionSection>
                    )}

                    {/* 9 · Consolidated */}
                    {consolidated && (
                        <AccordionSection
                            id="consolidated" icon={<BarChart3 size={16} />} title="Consolidated Report"
                            badge={`${consolidated.period.startMonth} → ${consolidated.period.endMonth}`}
                            isOpen={isOpen("consolidated")} onToggle={() => toggle("consolidated")}
                            onExport={() => handleExport("consolidated")} exporting={exportingId === "consolidated"}
                            kpis={[
                                { label: "Total Payout", value: formatPeso(consolidated.payrollTotals.total_payout) },
                                { label: "Days", value: String(consolidated.payrollTotals.total_days) },
                                { label: "Beneficiaries", value: String(consolidated.payrollTotals.total_beneficiaries) },
                            ]}
                        >
                            {consolidated.applications.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">Applications Summary</h4>
                                    <DataTable headers={["Program", "Status", "Count", "Male", "Female"]} rows={consolidated.applications.map((a) => [programLabel(a.program_type), a.status, a.count, a.male, a.female])} alignRight={[2, 3, 4]} />
                                </div>
                            )}
                            {consolidated.payrollMonthly.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">Monthly Payroll</h4>
                                    <DataTable headers={["Month", "Program", "Beneficiaries", "Days", "Payout"]} rows={consolidated.payrollMonthly.map((p) => [p.payroll_month, programLabel(p.program_type), p.beneficiary_count, p.total_days, formatPeso(p.total_payout)])} alignRight={[2, 3, 4]} />
                                </div>
                            )}
                            {consolidated.programBudgets.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">Budget Utilization</h4>
                                    <DataTable
                                        headers={["Program", "Budget", "Used", "Remaining", "Util %", "Slots", "Filled", "Fill %"]}
                                        rows={consolidated.programBudgets.map((p) => [p.program_name, formatPeso(p.budget), formatPeso(p.used), formatPeso(p.remaining), safe(p.utilization_rate).toFixed(1) + "%", p.slots, p.filled, safe(p.slot_rate).toFixed(1) + "%"])}
                                        alignRight={[1, 2, 3, 4, 5, 6, 7]}
                                    />
                                </div>
                            )}
                            {consolidated.disbursements.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">Disbursements</h4>
                                    <DataTable headers={["Status", "Batches", "Amount", "Recipients"]} rows={consolidated.disbursements.map((d) => [d.status, d.batch_count, formatPeso(d.total_amount), d.total_recipients])} alignRight={[1, 2, 3]} />
                                </div>
                            )}
                            {consolidated.attendance.length > 0 && (
                                <div>
                                    <h4 className="mb-2 text-xs font-semibold text-slate-600">Attendance</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {consolidated.attendance.map((a) => (
                                            <div key={a.status} className="rounded-lg bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                                                <p className="text-base font-bold text-slate-900">{a.count}</p>
                                                <p className="text-[9px] font-semibold uppercase text-slate-400">{a.status}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </AccordionSection>
                    )}

                    {/* ── Print-only header ──────────── */}
                    <div className="hidden print:block text-center mb-4">
                        <p className="text-xs uppercase tracking-widest text-slate-400">Republic of the Philippines</p>
                        <p className="text-xs font-semibold text-slate-600">Municipality of Juban, Province of Sorsogon</p>
                        <p className="text-sm font-bold text-emerald-700 mt-1">PUBLIC EMPLOYMENT SERVICE OFFICE (PESO)</p>
                        <p className="text-sm text-slate-500 mt-1">Report Period: {reportLabel}</p>
                    </div>
                </>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════
// ██  SUB-COMPONENTS
// ══════════════════════════════════════════════════════

// ── KPI Card ─────────────────────────────────────────

const accentMap = { emerald: "border-l-emerald-500", blue: "border-l-blue-500", violet: "border-l-violet-500", amber: "border-l-amber-500", rose: "border-l-rose-500" };

const KpiCard = ({ label, value, sub, accent = "emerald" }: { label: string; value: string; sub: string; accent?: keyof typeof accentMap }) => (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${accentMap[accent]}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-xl font-bold text-slate-900 truncate">{value}</p>
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{sub}</p>
    </div>
);

// ── Accordion Section ────────────────────────────────

type AccordionProps = {
    id: string;
    icon: React.ReactNode;
    title: string;
    badge: string;
    isOpen: boolean;
    onToggle: () => void;
    onExport: () => void;
    exporting: boolean;
    kpis: { label: string; value: string }[];
    children: React.ReactNode;
};

const AccordionSection = ({ icon, title, badge, isOpen, onToggle, onExport, exporting, kpis, children }: AccordionProps) => (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print:break-inside-avoid">
        {/* Clickable header — always visible */}
        <div className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80">
            <button type="button" onClick={onToggle}
                className="flex flex-1 items-center gap-3 text-left transition-colors hover:bg-slate-50/80 focus:outline-none min-w-0">
                <span className="text-slate-400">{icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">{badge}</span>
                    </div>
                    {/* Inline KPIs visible when collapsed */}
                    {!isOpen && kpis.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                            {kpis.map((k) => (
                                <span key={k.label} className="text-[11px] text-slate-500">
                                    <span className="font-semibold text-slate-700">{k.value}</span> {k.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <span className="shrink-0 text-slate-300 print:hidden">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            </button>
            {/* Export button — separate from toggle button */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onExport(); }}
                disabled={exporting}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 print:hidden"
                title="Export to Excel"
            >
                {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Excel
            </button>
        </div>

        {/* Expanded content */}
        {isOpen && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                {/* KPIs in a grid when expanded */}
                {kpis.length > 0 && (
                    <div className={`grid gap-3 ${kpis.length <= 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
                        {kpis.map((k) => (
                            <div key={k.label} className="rounded-xl bg-slate-50 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
                                <p className="text-lg font-bold text-slate-900 mt-0.5">{k.value}</p>
                            </div>
                        ))}
                    </div>
                )}
                {children}
            </div>
        )}
    </section>
);

// ── Data Table ───────────────────────────────────────

const DataTable = ({ headers, rows, alignRight = [] }: { headers: string[]; rows: (string | number | null | undefined)[][]; alignRight?: number[] }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${alignRight.includes(i) ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {rows.length > 0 ? rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-50/60 transition-colors">
                        {row.map((cell, ci) => (
                            <td key={ci} className={`px-3 py-2 text-[12px] ${alignRight.includes(ci) ? "text-right tabular-nums font-medium" : ""} ${ci === 0 ? "font-medium text-slate-800" : "text-slate-600"}`}>
                                {cell ?? "N/A"}
                            </td>
                        ))}
                    </tr>
                )) : (
                    <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-xs text-slate-400">No data for this period.</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

export default Reports;