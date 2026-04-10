import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Loader } from "lucide-react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from '../../api/config';

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

function ReadOnlySection({ title, data }: { title: string; data: Record<string, unknown> | null }) {
    if (!data) return null;

    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (entries.length === 0) return null;

    return (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-6 py-5 md:grid-cols-2">
                {entries.map(([key, value]) => (
                    <div key={key}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatLabel(key)}</p>
                        <div className="mt-1 text-sm text-gray-900 break-words">{formatValue(value)}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function StaffApplicationDetails() {
    const navigate = useNavigate();
    const { applicationId } = useParams();
    const [details, setDetails] = useState<ApplicationDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
                <p className="text-sm text-gray-500">View submitted application data</p>
            </div>

            {loading && (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
                    <Loader className="animate-spin text-teal-600" size={28} />
                </div>
            )}
            {error && !loading && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
            )}

            {!loading && !error && details && (
                <>
                    {/* Quick summary bar */}
                    <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-teal-50 to-white px-6 py-5 shadow-sm">
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

                    <ReadOnlySection title="Application Information" data={details.application as unknown as Record<string, unknown>} />
                    <ReadOnlySection title="TUPAD Form Data" data={details.details.tupad as Record<string, unknown> | null} />
                    <ReadOnlySection title="SPES Form Data" data={details.details.spes as Record<string, unknown> | null} />
                    <ReadOnlySection title="DILP Form Data" data={details.details.dilp as Record<string, unknown> | null} />
                    <ReadOnlySection title="GIP Form Data" data={details.details.gip as Record<string, unknown> | null} />
                    <ReadOnlySection title="Jobseeker Form Data" data={details.details.jobseeker as Record<string, unknown> | null} />
                </>
            )}
        </div>
    );
}

export default StaffApplicationDetails;
