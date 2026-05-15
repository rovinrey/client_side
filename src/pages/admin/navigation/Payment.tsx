import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    Banknote,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    ClipboardList,
    Clock,
    Coins,
    Download,
    Layers,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Smartphone,
    Users,
    Wallet,
    X,
} from "lucide-react";
import {
    generatePayroll,
    getPayroll,
    approvePayroll,
    releasePayroll,
    createDisbursement,
    getDisbursements,
    updateDisbursementStatus,
    setDailyWage,
    getAllDailyWages,
    type PayrollResponse,
    type Disbursement,
    type DailyWageSettings,
} from '../../../api/payroll.api';
import { storageGet } from '../../../utils/storage';

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
        minimumFractionDigits: 2,
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
        Pending: "bg-amber-50 text-amber-800 ring-amber-200/80",
        Approved: "bg-sky-50 text-sky-800 ring-sky-200/80",
        Released: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
        Scheduled: "bg-slate-50 text-slate-700 ring-slate-200/80",
        Processing: "bg-amber-50 text-amber-800 ring-amber-200/80",
        Failed: "bg-red-50 text-red-800 ring-red-200/80",
    };
    return map[status] || "bg-slate-50 text-slate-700 ring-slate-200/80";
};

const inputControl =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10";

const SectionCard = ({
    children,
    className = "",
    paddingClass = "p-6 md:p-7",
}: {
    children: ReactNode;
    className?: string;
    paddingClass?: string;
}) => (
    <section
        className={`rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] ${paddingClass} ${className}`}
    >
        {children}
    </section>
);

const KpiCard = ({
    label,
    value,
    sub,
    icon: Icon,
}: {
    label: string;
    value: string;
    sub: string;
    icon: LucideIcon;
}) => (
    <div className="group flex gap-4 rounded-xl border border-slate-200/90 bg-linear-to-br from-white to-slate-50/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900/[0.04] text-slate-700 ring-1 ring-slate-900/8">
            <Icon size={20} strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">{label}</p>
            <p className="mt-1.5 truncate text-xl font-semibold tabular-nums tracking-tight text-slate-900 md:text-[1.375rem]">
                {value}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
        </div>
    </div>
);

const PaymentPage = () => {
    const isAdmin = storageGet('role') === 'admin';

    const [month, setMonth] = useState<string>(toMonthInputDefault());
    const [programFilter, setProgramFilter] = useState<string>("all");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [payroll, setPayroll] = useState<PayrollResponse | null>(null);
    const [disbursements, setDisbursements] = useState<Disbursement[]>([]);

    const [dailyWages, setDailyWages] = useState<DailyWageSettings>({});
    const [editingProgramWage, setEditingProgramWage] = useState<string | null>(null);
    const [programWageInput, setProgramWageInput] = useState("");
    const [savingProgramWage, setSavingProgramWage] = useState(false);
    const [wagesLoading, setWagesLoading] = useState(true);

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

    const fetchDailyWages = useCallback(async () => {
        setWagesLoading(true);
        try {
            const wages = await getAllDailyWages();
            setDailyWages(wages);
        } catch (err) {
            console.error("Failed to load daily wages:", err);
            setDailyWages({ tupad: 435, spes: 435, dilp: 435, gip: 435, job_seekers: 435 });
        } finally {
            setWagesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDailyWages();
    }, [fetchDailyWages]);

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
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to load payroll data.");
        } finally {
            setLoading(false);
        }
    }, [month, programFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const pendingCount = useMemo(
        () => payroll?.records?.filter((r) => r.status === "Pending").length || 0,
        [payroll]
    );

    const approvedCount = useMemo(
        () => payroll?.records?.filter((r) => r.status === "Approved").length || 0,
        [payroll]
    );

    const releasedCount = useMemo(
        () => payroll?.records?.filter((r) => r.status === "Released").length || 0,
        [payroll]
    );

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generatePayroll(month);
            await fetchData();
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to generate payroll.");
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
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to approve payroll.");
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
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to release payroll.");
        } finally {
            setReleasing(false);
        }
    };

    const openProgramWageEditor = (programType: string, currentWage: number) => {
        setEditingProgramWage(programType);
        setProgramWageInput(String(currentWage || 435));
    };

    const cancelProgramWageEdit = () => {
        setEditingProgramWage(null);
        setProgramWageInput("");
    };

    const saveProgramWage = async () => {
        const parsed = parseFloat(programWageInput);
        if (isNaN(parsed) || parsed <= 0 || !editingProgramWage) return;
        setSavingProgramWage(true);
        try {
            await setDailyWage(editingProgramWage, parsed);
            cancelProgramWageEdit();
            await fetchDailyWages();
            await fetchData();
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to update daily wage.");
        } finally {
            setSavingProgramWage(false);
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
            rows.push([
                r.full_name,
                programLabel(r.program_type),
                r.days_worked,
                r.daily_wage,
                r.total_payout,
                r.status,
            ]);
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
                recipient_count: parseInt(disForm.recipient_count, 10) || 0,
                payment_mode: disForm.payment_mode,
                scheduled_date: disForm.scheduled_date || undefined,
                notes: disForm.notes || undefined,
            });
            setShowDisModal(false);
            setDisForm({
                program_type: "tupad",
                total_amount: "",
                recipient_count: "",
                payment_mode: "Cash",
                scheduled_date: "",
                notes: "",
            });
            await fetchData();
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to create disbursement.");
        } finally {
            setDisCreating(false);
        }
    };

    const handleDisbursementStatus = async (id: number, status: string) => {
        try {
            await updateDisbursementStatus(id, status);
            await fetchData();
        } catch (err: unknown) {
            const message =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setError(message || "Failed to update status.");
        }
    };

    const workflowSteps = [
        { label: "Pending review", count: pendingCount, color: "bg-amber-400" },
        { label: "Approved", count: approvedCount, color: "bg-sky-500" },
        { label: "Released", count: releasedCount, color: "bg-emerald-500" },
    ];

    const tableHead =
        "px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";

    return (
        <div className="mx-auto w-full max-w-7xl space-y-8 pb-12">
            <header className="border-b border-slate-200/80 pb-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-[2rem]">
                            Payroll and Payout Management
                        </h1>
                        <p className="max-w-xl text-[15px] leading-relaxed text-slate-600">
                            Manage payroll and payout operations for various programs.
                        </p>
                    </div>

                    <SectionCard paddingClass="p-4 md:p-5" className="w-full lg:max-w-[28rem] shrink-0">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Report filters
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-600">
                                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                        Payroll month
                                    </span>
                                    <input
                                        type="month"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className={`${inputControl} font-medium`}
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-600">
                                        <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                        Program
                                    </span>
                                    <div className="relative">
                                        <select
                                            value={programFilter}
                                            onChange={(e) => setProgramFilter(e.target.value)}
                                            className={`${inputControl} cursor-pointer appearance-none pr-10 font-medium`}
                                        >
                                            <option value="all">All programs</option>
                                            <option value="tupad">TUPAD</option>
                                            <option value="spes">SPES</option>
                                            <option value="dilp">DILP</option>
                                            <option value="gip">GIP</option>
                                            <option value="job_seekers">Job Seekers</option>
                                        </select>
                                        <ChevronDown
                                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                            aria-hidden
                                        />
                                    </div>
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                                    >
                                        {generating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" aria-hidden />
                                        )}
                                        Generate payroll
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={exportPayroll}
                                    disabled={!payroll || loading}
                                    className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                                >
                                    <Download className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                    Export CSV
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </header>

            {error && (
                <div
                    role="alert"
                    className="flex gap-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-4 text-sm text-red-900 shadow-[0_1px_2px_rgba(127,29,29,0.06)] md:items-center md:justify-between md:gap-6"
                >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                        <p className="leading-relaxed">{error}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-800 ring-1 ring-red-300/80 transition-colors hover:bg-red-100"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* KPI */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                    label="Total payout"
                    value={formatPeso(payroll?.totals?.total_payout || 0)}
                    sub="Across programs in scope"
                    icon={Coins}
                />
                <KpiCard
                    label="Beneficiaries"
                    value={String(payroll?.records?.length || 0)}
                    sub="Rows in payroll"
                    icon={Users}
                />
                <KpiCard
                    label="Avg. days worked"
                    value={String(avgDaysWorked)}
                    sub="Per beneficiary"
                    icon={ClipboardList}
                />
                <KpiCard label="Period" value={reportLabel} sub="Reporting month" icon={CalendarDays} />
                <KpiCard
                    label="Active programs"
                    value={String(programs.length)}
                    sub="Programs with data"
                    icon={Wallet}
                />
            </div>

            {/* Workflow snapshot */}
            <SectionCard paddingClass="p-5 md:px-6 md:py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Approval pipeline</p>
                        <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                            Counts reflect the ledger below for{" "}
                            <span className="font-medium text-slate-700">{reportLabel}</span>
                            {programFilter !== "all" ? ` · ${programLabel(programFilter)} only` : ""}.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                        {workflowSteps.map((step, idx) => (
                            <div key={step.label} className="flex items-center gap-1">
                                {idx > 0 && (
                                    <ChevronRight className="mx-2 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                                )}
                                <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-white px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
                                    <span
                                        className={`h-2 w-full max-w-[3rem] rounded-full ${step.color}`}
                                        aria-hidden
                                        title={step.label}
                                    />
                                    <div>
                                        <p className="text-xl font-semibold tabular-nums leading-none tracking-tight text-slate-900">
                                            {step.count}
                                        </p>
                                        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                            {step.label}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionCard>

            {/* Daily wages */}
            <SectionCard>
                <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Daily wage by program</h2>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            Rates apply on the next{" "}
                            <span className="font-medium text-slate-800">Generate payroll</span> run.{` `}
                            {!isAdmin && "Only admins can edit these values."}
                        </p>
                    </div>
                </div>

                {wagesLoading ? (
                    <div className="flex items-center gap-3 py-12 text-sm text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                        Loading wage settings…
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {Object.entries(PROGRAM_LABELS).map(([programKey, programLabelText]) => {
                            const currentWage = dailyWages[programKey] || 435;
                            const isEditing = editingProgramWage === programKey;
                            return (
                                <div
                                    key={programKey}
                                    className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
                                >
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        {programLabelText}
                                    </p>
                                    {isEditing ? (
                                        <div className="mt-3 flex items-stretch gap-2">
                                            <div className="relative min-w-0 flex-1">
                                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                                    ₱
                                                </span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step="0.01"
                                                    value={programWageInput}
                                                    onChange={(e) => setProgramWageInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") void saveProgramWage();
                                                        if (e.key === "Escape") cancelProgramWageEdit();
                                                    }}
                                                    className={`${inputControl} pl-7`}
                                                    autoFocus
                                                    disabled={savingProgramWage}
                                                    aria-label={`Edit daily wage for ${programLabelText}`}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void saveProgramWage()}
                                                disabled={savingProgramWage}
                                                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                                                title="Save"
                                            >
                                                <Check className="h-4 w-4" aria-hidden />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelProgramWageEdit}
                                                disabled={savingProgramWage}
                                                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50"
                                                title="Cancel"
                                            >
                                                <X className="h-4 w-4" aria-hidden />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <span className="text-lg font-semibold tabular-nums text-slate-900">
                                                {formatPeso(currentWage)}
                                            </span>
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => openProgramWageEditor(programKey, currentWage)}
                                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200"
                                                    title="Edit wage"
                                                >
                                                    <Pencil className="h-4 w-4" aria-hidden />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* Program breakdown */}
            {payroll?.byProgram && Object.keys(payroll.byProgram).length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {Object.entries(payroll.byProgram).map(([key, val]) => (
                        <div
                            key={key}
                            className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                {programLabel(key)}
                            </p>
                            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                                {formatPeso(val.total_payout)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {val.count} beneficiaries · {val.days_worked} days logged
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Payroll table */}
            <SectionCard paddingClass="p-0 overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0 space-y-1">
                        <h2 className="text-lg font-semibold text-slate-900">Payroll ledger</h2>
                        {payroll?.calculation_note && (
                            <p className="text-xs leading-relaxed text-slate-500">{payroll.calculation_note}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {isAdmin && pendingCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void handleApprove()}
                                disabled={approving}
                                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {approving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                    <Check className="h-4 w-4" aria-hidden />
                                )}
                                Approve all pending
                            </button>
                        )}
                        {isAdmin && approvedCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void handleRelease()}
                                disabled={releasing}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {releasing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                                )}
                                Release approved
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4">
                    {loading ? (
                        <div className="flex justify-center gap-3 py-16 text-sm text-slate-500">
                            <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                            Loading payroll…
                        </div>
                    ) : (
                        <>
                            {!error && payroll && (
                                <p className="mb-4 text-xs text-slate-500">
                                    Showing <span className="font-medium text-slate-700">{reportLabel}</span>
                                    {" · "}
                                    <span className="tabular-nums text-slate-600">
                                        pending {pendingCount}, approved {approvedCount}, released {releasedCount}
                                    </span>
                                </p>
                            )}
                            <div className="-mx-6 overflow-x-auto sm:-mx-6 md:rounded-b-xl">
                                <table className="w-full min-w-[860px] text-sm">
                                    <thead className="border-y border-slate-200 bg-slate-50/90">
                                        <tr>
                                            <th className={tableHead}>Beneficiary</th>
                                            <th className={tableHead}>Program</th>
                                            <th className={`${tableHead} text-right tabular-nums`}>Days</th>
                                            <th className={`${tableHead} text-right tabular-nums`}>Daily wage</th>
                                            <th className={`${tableHead} text-right tabular-nums`}>Total</th>
                                            <th className={`${tableHead} text-center`}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payroll?.records?.map((r) => (
                                            <tr key={r.payroll_id} className="bg-white hover:bg-slate-50/60">
                                                <td className="px-4 py-3 font-medium text-slate-900">{r.full_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                                        {programLabel(r.program_type)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                                                    {r.days_worked}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                                                    {formatPeso(r.daily_wage)}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                                                    {formatPeso(r.total_payout)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusBadge(r.status)}`}
                                                    >
                                                        {r.status === "Released" ? (
                                                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                                                        ) : r.status === "Approved" ? (
                                                            <Check className="h-3 w-3" aria-hidden />
                                                        ) : (
                                                            <Clock className="h-3 w-3" aria-hidden />
                                                        )}
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {!payroll?.records?.length && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-4 py-16 text-center text-sm text-slate-500"
                                                >
                                                    No payroll for this selection. Generate payroll from attendance records
                                                    to populate this table.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {(payroll?.records?.length ?? 0) > 0 && (
                                        <tfoot className="border-t border-slate-200 bg-slate-50/80">
                                            <tr>
                                                <td className="px-4 py-3.5 font-semibold text-slate-900">
                                                    Totals
                                                </td>
                                                <td className="px-4 py-3.5" />
                                                <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                                                    {payroll?.totals?.days_worked || 0}
                                                </td>
                                                <td className="px-4 py-3.5 text-right tabular-nums text-sm font-medium text-slate-600">
                                                    {formatPeso(payroll?.dailyWage || 435)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-base tabular-nums font-semibold text-slate-900">
                                                    {formatPeso(payroll?.totals?.total_payout || 0)}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </SectionCard>

            {/* Disbursements */}
            <SectionCard paddingClass="p-0 overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Disbursement batches</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Track batch codes, schedules, and release status per program.
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setShowDisModal(true)}
                            className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 md:self-auto"
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            New batch
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50/90">
                            <tr>
                                <th className={`${tableHead} pl-6`}>Batch</th>
                                <th className={tableHead}>Program</th>
                                <th className={tableHead}>Mode</th>
                                <th className={`${tableHead} tabular-nums`}>Amount</th>
                                <th className={`${tableHead} tabular-nums`}>Recipients</th>
                                <th className={tableHead}>Status</th>
                                <th className={tableHead}>Reference</th>
                                <th className={`${tableHead} pr-6 text-right`}>Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {disbursements.map((d) => (
                                <tr key={d.disbursement_id} className="hover:bg-slate-50/60">
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-900">{d.batch_code}</span>
                                        <span className="mt-0.5 block text-xs text-slate-500">{d.payroll_month}</span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {programLabel(d.program_type)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                                d.payment_mode === "GCash"
                                                    ? "text-teal-700"
                                                    : d.payment_mode === "Bank Transfer"
                                                      ? "text-sky-700"
                                                      : "text-emerald-700"
                                            }`}
                                        >
                                            {d.payment_mode === "GCash" ? (
                                                <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                                            ) : (
                                                <Banknote className="h-4 w-4 shrink-0" aria-hidden />
                                            )}
                                            {d.payment_mode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 tabular-nums font-semibold text-slate-900">
                                        {formatPeso(d.total_amount)}
                                    </td>
                                    <td className="px-6 py-4 tabular-nums text-slate-700">{d.recipient_count}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusBadge(d.status)}`}
                                        >
                                            {d.status === "Released" ? (
                                                <CheckCircle2 className="h-3 w-3" aria-hidden />
                                            ) : (
                                                <Clock className="h-3 w-3" aria-hidden />
                                            )}
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold uppercase text-slate-600">
                                            {d.reference_number || "—"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {isAdmin && d.status === "Scheduled" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void handleDisbursementStatus(d.disbursement_id, "Processing")
                                                }
                                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
                                            >
                                                Process
                                            </button>
                                        )}
                                        {isAdmin && d.status === "Processing" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void handleDisbursementStatus(d.disbursement_id, "Released")
                                                }
                                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                                            >
                                                Release
                                            </button>
                                        )}
                                        {d.status === "Released" && (
                                            <span className="text-xs font-medium text-emerald-600">Completed</span>
                                        )}
                                        {!isAdmin && (d.status === "Scheduled" || d.status === "Processing") && (
                                            <span className="text-xs text-slate-500">Requires admin</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {disbursements.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-14 text-center text-sm text-slate-500">
                                        No disbursement batches for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {showDisModal && (
                <>
                    <div
                        role="presentation"
                        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px]"
                        onClick={() => setShowDisModal(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setShowDisModal(false);
                        }}
                        aria-hidden
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="disbursement-modal-title"
                        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(560px,calc(100vh-4rem))] w-full max-w-lg -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h3 id="disbursement-modal-title" className="text-lg font-semibold text-slate-900">
                                    New disbursement batch
                                </h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Linked to <span className="font-medium text-slate-800">{reportLabel}</span>.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDisModal(false)}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" aria-hidden />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-semibold text-slate-700">Program</span>
                                <select
                                    value={disForm.program_type}
                                    onChange={(e) => setDisForm({ ...disForm, program_type: e.target.value })}
                                    className={`${inputControl} mt-2`}
                                >
                                    <option value="tupad">TUPAD</option>
                                    <option value="spes">SPES</option>
                                    <option value="dilp">DILP</option>
                                    <option value="gip">GIP</option>
                                    <option value="job_seekers">Job Seekers</option>
                                </select>
                            </label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-700">Total amount (PHP)</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={disForm.total_amount}
                                        onChange={(e) => setDisForm({ ...disForm, total_amount: e.target.value })}
                                        className={`${inputControl} mt-2 tabular-nums`}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-700">Recipients</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={disForm.recipient_count}
                                        onChange={(e) => setDisForm({ ...disForm, recipient_count: e.target.value })}
                                        className={`${inputControl} mt-2 tabular-nums`}
                                    />
                                </label>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-700">Payment mode</span>
                                    <select
                                        value={disForm.payment_mode}
                                        onChange={(e) => setDisForm({ ...disForm, payment_mode: e.target.value })}
                                        className={`${inputControl} mt-2`}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Bank Transfer">Bank transfer</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-700">Scheduled date</span>
                                    <input
                                        type="date"
                                        value={disForm.scheduled_date}
                                        onChange={(e) => setDisForm({ ...disForm, scheduled_date: e.target.value })}
                                        className={`${inputControl} mt-2`}
                                    />
                                </label>
                            </div>
                            <label className="block">
                                <span className="text-xs font-semibold text-slate-700">Notes</span>
                                <textarea
                                    value={disForm.notes}
                                    onChange={(e) => setDisForm({ ...disForm, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Optional context for auditors or staff."
                                    className={`${inputControl} mt-2 resize-none`}
                                />
                            </label>
                        </div>
                        <div className="mt-8 flex justify-end gap-2 border-t border-slate-100 pt-6">
                            <button
                                type="button"
                                onClick={() => setShowDisModal(false)}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCreateDisbursement()}
                                disabled={disCreating}
                                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                            >
                                {disCreating ? "Creating…" : "Create batch"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PaymentPage;
