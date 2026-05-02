import React, { useEffect, useState, useCallback, useRef } from "react";
import { ArrowLeft, Loader, Pencil, Save, X, FileSpreadsheet, Printer, CheckCircle, XCircle, FileText, Download, Eye, Trash2, Edit2, FileDown } from "lucide-react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from '../../../api/config';
import { storageGet } from '../../../utils/storage';

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

interface DocumentInfo {
    document_id: number;
    user_id: number;
    program_type: string;
    document_type: string;
    document_type_label: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    is_verified: number;
    verified_by: number | null;
    verified_at: string | null;
    verified_by_name: string | null;
    url: string;
}

interface ApplicationDetailsResponse {
    application: ApplicationBase;
    details: Record<string, Record<string, unknown> | null>;
}

const getAuthHeaders = () => {
    const token = storageGet("token");
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
                    `${API_BASE_URL}/api/applications/${applicationId}/beneficiary`,
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
                    `${API_BASE_URL}/api/applications/excel/update`,
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

// ─── Documents Section Component ─────────────────────
function DocumentsSection({
    userId,
    documents,
    loading,
    onVerify,
    onReject,
    onRefresh,
}: {
    applicationId: number;
    userId: number | null;
    documents: DocumentInfo[];
    loading: boolean;
    onVerify: (documentId: number) => void;
    onReject: (documentId: number) => void;
    onRefresh: () => void;
}) {
const token = storageGet("token") || "";
    const replaceInputRef = useRef<HTMLInputElement>(null);

    const [previewDoc, setPreviewDoc] = useState<DocumentInfo | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DocumentInfo | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [replacingId, setReplacingId] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);

    // Handlers for document operations
    const handleViewDocument = (doc: DocumentInfo) => setPreviewDoc(doc);

    const handlePrint = (doc: DocumentInfo) => {
        const url = `${API_BASE_URL}${doc.url}`;
        const isImage = doc.mime_type?.startsWith("image/");
        const isPdf = doc.mime_type === "application/pdf";

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        if (isImage) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print - ${doc.document_type_label}</title>
                    <style>
                        @media print { body { margin: 0; } img { max-width: 100%; height: auto; } }
                        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
                        img { max-width: 100%; max-height: 95vh; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <img src="${url}" onload="window.print(); window.close();" />
                </body>
                </html>
            `);
        } else if (isPdf) {
            printWindow.document.write(`
                <html>
                <head><title>Print - ${doc.document_type_label}</title></head>
                <body style="margin:0">
                    <iframe src="${url}" style="width:100%;height:100vh;border:none;" onload="setTimeout(()=>{this.contentWindow.print();},500)"></iframe>
                </body>
                </html>
            `);
        }
        printWindow.document.close();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await axios.delete(
                `${API_BASE_URL}/api/admin/documents/${deleteTarget.document_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDeleteTarget(null);
            onRefresh();
        } catch (err: any) {
            alert(err?.response?.data?.message || "Failed to delete document");
        } finally {
            setDeleting(false);
        }
    };

    const handleStartReplace = (docId: number) => {
        setReplacingId(docId);
        setTimeout(() => replaceInputRef.current?.click(), 50);
    };

    const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !replacingId) {
            setReplacingId(null);
            return;
        }

        const formData = new FormData();
        formData.append("document", file);

        try {
            await axios.put(
                `${API_BASE_URL}/api/admin/documents/${replacingId}`,
                formData,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
            );
            onRefresh();
        } catch (err: any) {
            alert(err?.response?.data?.message || "Failed to replace document");
        } finally {
            setReplacingId(null);
            if (replaceInputRef.current) replaceInputRef.current.value = "";
        }
    };

    const handleExportWord = async () => {
        if (!userId) return;
        setExporting(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/admin/documents/export-word/${userId}`,
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: "blob"
                }
            );
            const url = URL.createObjectURL(response.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Document_Report_${new Date().toISOString().slice(0, 10)}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err?.response?.data?.message || "Failed to export documents");
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Submitted Documents</h2>
                </div>
                <div className="flex items-center justify-center px-6 py-8">
                    <Loader className="animate-spin text-teal-600" size={24} />
                </div>
            </section>
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Submitted Documents</h2>
                </div>
                <div className="px-6 py-8 text-center">
                    <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No documents submitted yet</p>
                </div>
            </section>
        );
    }

    return (
        <>
            {/* Hidden file input for replace */}
            <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleReplaceFile}
            />

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Submitted Documents</h2>
                        <p className="text-xs text-gray-500 mt-1">{documents.length} document(s) submitted</p>
                    </div>
                    {documents.length > 0 && (
                        <button
                            onClick={handleExportWord}
                            disabled={exporting || !userId}
                            className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            <FileDown size={14} />
                            {exporting ? "Exporting..." : "Export to Word"}
                        </button>
                    )}
                </div>

                <div className="divide-y divide-gray-100">
                    {documents.map((doc) => (
                        <div key={doc.document_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900">{doc.document_type_label}</h3>
                                        {doc.is_verified ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                <CheckCircle size={12} /> Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                                                <XCircle size={12} /> Pending
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mb-2">
                                        <span className="font-medium">{doc.original_name}</span>
                                        {doc.file_size && (
                                            <>
                                                {" "} • {(doc.file_size / 1024).toFixed(1)} KB
                                            </>
                                        )}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>
                                            <span className="font-medium">Uploaded:</span>{" "}
                                            {new Date(doc.uploaded_at).toLocaleString("en-PH", {
                                                year: "numeric", month: "short", day: "numeric",
                                                hour: "2-digit", minute: "2-digit"
                                            })}
                                        </div>
                                        {doc.is_verified && doc.verified_at && (
                                            <div>
                                                <span className="font-medium">Verified:</span>{" "}
                                                {new Date(doc.verified_at).toLocaleString("en-PH", {
                                                    year: "numeric", month: "short", day: "numeric",
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </div>
                                        )}
                                        {doc.is_verified && doc.verified_by_name && (
                                            <div>
                                                <span className="font-medium">Verified by:</span> {doc.verified_by_name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleViewDocument(doc)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        <Eye size={13} /> View
                                    </button>
                                    <button
                                        onClick={() => handlePrint(doc)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Printer size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleStartReplace(doc.document_id)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(doc)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                    {!doc.is_verified ? (
                                        <button
                                            onClick={() => onVerify(doc.document_id)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors ml-1"
                                        >
                                            <CheckCircle size={13} /> Verify
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onReject(doc.document_id)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors ml-1"
                                        >
                                            <XCircle size={13} /> Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">{previewDoc.document_type_label}</h3>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
                            {previewDoc.mime_type?.startsWith("image/") ? (
                                <img
                                    src={`${API_BASE_URL}${previewDoc.url}`}
                                    alt={previewDoc.document_type_label}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : previewDoc.mime_type === "application/pdf" ? (
                                <iframe
                                    src={`${API_BASE_URL}${previewDoc.url}`}
                                    className="w-full h-full border-0"
                                    title={previewDoc.document_type_label}
                                />
                            ) : (
                                <div className="text-center text-gray-500 p-8">
                                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>Preview not available for this file type</p>
                                    <a
                                        href={`${API_BASE_URL}${previewDoc.url}`}
                                        download
                                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Download size={16} /> Download
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <Trash2 size={20} className="text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Delete Document</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to delete "{deleteTarget.original_name}"? This action cannot be undone.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Main Page ───────────────────────────────────────
function ApplicationDetails() {
    const navigate = useNavigate();
    const { applicationId } = useParams();
    const [details, setDetails] = useState<ApplicationDetailsResponse | null>(null);
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [documentsLoading, setDocumentsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [, setVerifying] = useState<number | null>(null);

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

    const fetchDocuments = useCallback(async () => {
        if (!applicationId) return;
        if (!details?.application?.user_id) return;
        
        setDocumentsLoading(true);
        try {
            const res = await axios.get<{ documents: DocumentInfo[] }>(
                `${API_BASE_URL}/api/admin/documents/`,
                { 
                    headers: getAuthHeaders(),
                    params: { userId: details.application.user_id }
                }
            );
            setDocuments(res.data.documents || []);
        } catch (err: any) {
            console.error("Failed to load documents:", err?.response?.data?.message);
            setDocuments([]);
        } finally {
            setDocumentsLoading(false);
        }
    }, [applicationId, details]);

    const handleVerifyDocument = async (documentId: number) => {
        setVerifying(documentId);
        try {
            await axios.put(
                `${API_BASE_URL}/api/admin/documents/${documentId}/verify`,
                {},
                { headers: getAuthHeaders() }
            );
            await fetchDocuments();
        } catch (err: any) {
            alert(err?.response?.data?.message || "Failed to verify document");
        } finally {
            setVerifying(null);
        }
    };

    const handleRejectDocument = async (documentId: number) => {
        setVerifying(documentId);
        try {
            await axios.put(
                `${API_BASE_URL}/api/admin/documents/${documentId}/reject`,
                {},
                { headers: getAuthHeaders() }
            );
            await fetchDocuments();
        } catch (err: any) {
            alert(err?.response?.data?.message || "Failed to reject document");
        } finally {
            setVerifying(null);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    useEffect(() => {
        if (details?.application?.user_id) {
            fetchDocuments();
        }
    }, [details?.application?.user_id]);

    const ANNEX_EXPORT_BY_PROGRAM: Record<
        string,
        { label: string; path: string; downloadPrefix: string }
    > = {
        tupad: {
            label: "Export Annex D (TUPAD)",
            path: "/api/applications/annex-d/export",
            downloadPrefix: "Annex_D_TUPAD",
        },
        spes: {
            label: "Export Annex B (SPES)",
            path: "/api/applications/annex-b/export",
            downloadPrefix: "Annex_B_SPES",
        },
        gip: {
            label: "Export Annex H (GIP)",
            path: "/api/applications/annex-h/export",
            downloadPrefix: "Annex_H_GIP",
        },
        job_seekers: {
            label: "Export Annex L (Job seekers)",
            path: "/api/applications/annex-l/export",
            downloadPrefix: "Annex_L_JobSeekers",
        },
    };

    const handleAnnexExcelExport = async () => {
        const pt = details?.application.program_type || "";
        const cfg = ANNEX_EXPORT_BY_PROGRAM[pt];
        if (!cfg) return;
        setExporting(true);
        try {
            const res = await axios.get(`${API_BASE_URL}${cfg.path}`, {
                headers: getAuthHeaders(),
                responseType: "blob",
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${cfg.downloadPrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Export failed. Ensure you are logged in as admin and try again.");
        } finally {
            setExporting(false);
        }
    };

    // ── Print handler ──
    const handlePrint = () => {
        window.print();
    };

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
                    <p className="text-sm text-gray-500">
                        View, edit submitted data, and export approved beneficiaries to the matching PESO annex Excel
                        (Annex D–TUPAD, B–SPES, H–GIP, L–job seekers).
                    </p>
                </div>

                {details && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium text-sm"
                        >
                            <Printer size={16} /> Print
                        </button>
                        {details.application.program_type &&
                            ANNEX_EXPORT_BY_PROGRAM[details.application.program_type] && (
                                <button
                                    onClick={handleAnnexExcelExport}
                                    disabled={exporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium text-sm shadow-md shadow-green-100 disabled:opacity-50"
                                >
                                    <FileSpreadsheet size={16} />
                                    {exporting
                                        ? "Exporting..."
                                        : ANNEX_EXPORT_BY_PROGRAM[details.application.program_type].label}
                                </button>
                            )}
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

                    {/* Documents Section */}
                    <DocumentsSection 
                        applicationId={Number(applicationId)}
                        userId={details.application.user_id}
                        documents={documents}
                        loading={documentsLoading}
                        onVerify={handleVerifyDocument}
                        onReject={handleRejectDocument}
                        onRefresh={fetchDocuments}
                    />

                    {/* Editable sections */}
                    <EditableSection
                        title="Application Information"
                        data={details.application as unknown as Record<string, unknown>}
                        applicationId={Number(applicationId)}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="TUPAD Form Data"
                        data={details.details.tupad as Record<string, unknown> | null}
                        applicationId={Number(applicationId)}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="SPES Form Data"
                        data={details.details.spes as Record<string, unknown> | null}
                        applicationId={Number(applicationId)}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="DILP Form Data"
                        data={details.details.dilp as Record<string, unknown> | null}
                        applicationId={Number(applicationId)}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="GIP Form Data"
                        data={details.details.gip as Record<string, unknown> | null}
                        applicationId={Number(applicationId)}
                        onSaved={fetchDetails}
                    />
                    <EditableSection
                        title="Jobseeker Form Data"
                        data={details.details.jobseeker as Record<string, unknown> | null}
                        applicationId={Number(applicationId)}
                        onSaved={fetchDetails}
                    />
                </>
            )}
        </div>
    );
}

export default ApplicationDetails;