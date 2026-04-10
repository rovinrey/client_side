import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Loader, Pencil, Save, X, FileSpreadsheet, Printer } from "lucide-react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from '../../../api/config';

// ─── Types ───────────────────────────────────────────
interface ApplicationBase {
    application_id: number;
    user_id: number;
    program_type: string;
    status: string;
    rejection_reason: string | null;
    applied_at: string | null;
    approval_date: string | null;
    updated_at: string | null;
    email: string | null;
    phone: string | null;
    beneficiary_id: number | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    gender: string | null;
    contact_number: string | null;
    address: string | null;
}

interface ApplicationDetailsResponse {
    application: ApplicationBase;
    details: Record<string, Record<string, unknown> | null>;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Formatting helpers ──────────────────────────────
const formatLabel = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string") {
        if (value.startsWith("data:image/")) {
            return <img src={value} alt="Signature" className="mt-1 max-h-24 border rounded" />;
        }
        const looksLikeDate = /^\d{4}-\d{2}-\d{2}/.test(value) || value.includes("T");
        if (looksLikeDate) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString("en-PH", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: value.includes("T") ? "2-digit" : undefined,
                    minute: value.includes("T") ? "2-digit" : undefined,
                });
            }
        }
        return value;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return "-";
        return (
            <div className="space-y-2 mt-1">
                {value.map((item, i) => (
                    <div key={i} className="text-xs bg-gray-50 rounded p-2">
                        {typeof item === "object" && item !== null
                            ? Object.entries(item as Record<string, unknown>)
                                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                                  .map(([k, v]) => (
                                      <div key={k}>
                                          <span className="font-medium text-gray-500">{formatLabel(k)}:</span>{" "}
                                          <span className="text-gray-900">{String(v)}</span>
                                      </div>
                                  ))
                            : String(item)}
                    </div>
                ))}
            </div>
        );
    }
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>).filter(
            ([, v]) => v !== null && v !== undefined && v !== ""
        );
        if (entries.length === 0) return "-";
        return (
            <div className="space-y-1 mt-1">
                {entries.map(([k, v]) => (
                    <div key={k} className="text-xs">
                        <span className="font-medium text-gray-500">{formatLabel(k)}:</span>{" "}
                        <span className="text-gray-900">{formatValue(v)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return String(value);
};

// Fields that should never be editable (system fields)
const NON_EDITABLE_FIELDS = new Set([
    "application_id", "user_id", "beneficiary_id", "detail_id",
    "applied_at", "approval_date", "updated_at", "created_at",
    "status", "rejection_reason", "program_type",
]);

// Map section title to DB table for batch updates
const SECTION_TABLE_MAP: Record<string, string> = {
    "Application Information": "beneficiaries",
    "TUPAD Form Data": "tupad_details",
    "SPES Form Data": "spes_details",
};

// ─── Editable Section Component ──────────────────────
function EditableSection({
    title,
    data,
    applicationId,
    onSaved,
}: {
    title: string;
    data: Record<string, unknown> | null;
    applicationId: number;
    onSaved: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    if (!data) return null;

    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (entries.length === 0) return null;

    const startEditing = () => {
        const vals: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
            if (!NON_EDITABLE_FIELDS.has(k)) {
                vals[k] = v === null || v === undefined ? "" : String(v);
            }
        });
        setEditValues(vals);
        setEditing(true);
        setSaveMsg(null);
    };

    const cancelEditing = () => {
        setEditing(false);
        setSaveMsg(null);
    };

    const handleChange = (key: string, value: string) => {
        setEditValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);

        const table = SECTION_TABLE_MAP[title];
        if (!table) {
            setSaveMsg("Cannot determine target table for this section.");
            setSaving(false);
            return;
        }

        try {
            if (table === "beneficiaries") {
                // Use the dedicated beneficiary update endpoint
                await axios.put(
                    `${API_BASE_URL}/api/forms/applications/${applicationId}/beneficiary`,
                    editValues,
                    { headers: getAuthHeaders() }
                );
            } else {
                // Build batch updates for program-specific details
                const detailId = data.detail_id as number | undefined;
                const updates = Object.entries(editValues).map(([field, value]) => ({
                    application_id: applicationId,
                    table,
                    field,
                    detail_id: detailId || null,
                    value: value || null,
                }));

                await axios.put(
                    `${API_BASE_URL}/api/forms/excel/update`,
                    { updates },
                    { headers: getAuthHeaders() }
                );
            }

            setSaveMsg("Saved successfully!");
            setEditing(false);
            onSaved();
        } catch (err: any) {
            setSaveMsg(err.response?.data?.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <div className="flex items-center gap-2">
                    {saveMsg && (
                        <span className={`text-xs font-medium ${saveMsg.includes("success") ? "text-green-600" : "text-red-500"}`}>
                            {saveMsg}
                        </span>
                    )}
                    {!editing ? (
                        <button
                            onClick={startEditing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                            <Pencil size={14} /> Edit
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={cancelEditing}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <X size={14} /> Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Save size={14} /> {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-6 py-5 md:grid-cols-2">
                {(editing
                    ? Object.entries(data)
                    : entries
                ).map(([key, value]) => {
                    const isEditable = editing && !NON_EDITABLE_FIELDS.has(key);
                    return (
                        <div key={key}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatLabel(key)}</p>
                            {isEditable ? (
                                <input
                                    type={key.includes("date") || key.includes("birth") ? "date" : "text"}
                                    value={editValues[key] ?? ""}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                />
                            ) : (
                                <div className="mt-1 text-sm text-gray-900 break-words">{formatValue(value)}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// ─── Main Page ───────────────────────────────────────
function ApplicationDetails() {
    const navigate = useNavigate();
    const { applicationId } = useParams();
    const [details, setDetails] = useState<ApplicationDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const fetchDetails = useCallback(async () => {
        if (!applicationId) {
            setError("Application ID is missing.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get<ApplicationDetailsResponse>(
                `${API_BASE_URL}/api/beneficiaries/${applicationId}/details`,
                { headers: getAuthHeaders() }
            );
            setDetails(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load application details.");
        } finally {
            setLoading(false);
        }
    }, [applicationId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    // ── Annex D Export ──
    const handleAnnexDExport = async () => {
        setExporting(true);
        try {
            const programType = details?.application.program_type || "tupad";
            const res = await axios.get(
                `${API_BASE_URL}/api/forms/annex-d/export?programType=${programType}`,
                {
                    headers: getAuthHeaders(),
                    responseType: "blob",
                }
            );
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Annex_D_${programType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Failed to export Annex D.");
        } finally {
            setExporting(false);
        }
    };

    // ── Print handler ──
    const handlePrint = () => {
        window.print();
    };

    const appId = Number(applicationId);

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
                    <p className="text-sm text-gray-500">View, edit submitted data, and export to Annex D format</p>
                </div>

                {details && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium text-sm"
                        >
                            <Printer size={16} /> Print
                        </button>
                        <button
                            onClick={handleAnnexDExport}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium text-sm shadow-md shadow-green-100 disabled:opacity-50"
                        >
                            <FileSpreadsheet size={16} />
                            {exporting ? "Exporting..." : "Export Annex D"}
                        </button>
                    </div>
                )}
            </div>

            {/* Loading / Error */}
            {loading && (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
                    <Loader className="animate-spin text-teal-600" size={28} />
                </div>
            )}
            {error && !loading && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
            )}

            {/* Content */}
            {!loading && !error && details && (
                <>
                    {/* Quick summary bar */}
                    <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-teal-50 to-white px-6 py-5 shadow-sm print:border print:shadow-none">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Application ID</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">#{details.application.application_id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Applicant</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">
                                    {[details.application.first_name, details.application.middle_name, details.application.last_name]
                                        .filter(Boolean).join(" ") || "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Program</p>
                                <p className="mt-1 text-sm font-medium uppercase text-gray-900">{details.application.program_type || "-"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    details.application.status === "Approved" ? "bg-green-100 text-green-700" :
                                    details.application.status === "Rejected" ? "bg-red-100 text-red-700" :
                                    "bg-yellow-100 text-yellow-700"
                                }`}>
                                    {details.application.status || "-"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Editable sections */}
                    <EditableSection
                        title="Application Information"
                        data={details.application as unknown as Record<string, unknown>}
                        applicationId={appId}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="TUPAD Form Data"
                        data={details.details.tupad as Record<string, unknown> | null}
                        applicationId={appId}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="SPES Form Data"
                        data={details.details.spes as Record<string, unknown> | null}
                        applicationId={appId}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="DILP Form Data"
                        data={details.details.dilp as Record<string, unknown> | null}
                        applicationId={appId}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="GIP Form Data"
                        data={details.details.gip as Record<string, unknown> | null}
                        applicationId={appId}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="Jobseeker Form Data"
                        data={details.details.jobseeker as Record<string, unknown> | null}
                        applicationId={appId}
                        onSaved={fetchDetails}
                    />
                </>
            )}
        </div>
    );
}

export default ApplicationDetails;