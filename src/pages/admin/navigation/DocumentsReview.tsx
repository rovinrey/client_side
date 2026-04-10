import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Download, Eye, Search, Filter, Loader, FileDown, Trash2, RefreshCw, Printer } from "lucide-react";
import adminDocumentsApi, { type SpesDocumentRecord } from "../../../api/adminDocuments.api";
import { API_BASE_URL } from '../../../api/config';

const PROGRAM_OPTIONS = [
    { label: "All Programs", value: "" },
    { label: "TUPAD", value: "tupad" },
    { label: "SPES", value: "spes" },
    { label: "DILP", value: "dilp" },
    { label: "GIP", value: "gip" },
    { label: "Job Seekers", value: "job_seekers" },
];

/* ── Unified row type for both generic + SPES docs ── */
interface UnifiedDocument {
    id: string;
    kind: "generic" | "spes";
    user_id: number;
    user_name: string;
    email: string;
    program_type: string;
    document_type_label: string;
    original_name: string;
    file_size: number | null;
    mime_type: string;
    uploaded_at: string;
    url: string;
    // generic-only
    document_id?: number;
    // spes-only
    spes_application_id?: number;
    spes_field_id?: string;
}

const formatFileSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/* Map backend column-key label → field_id */
const SPES_LABEL_TO_FIELD: Record<string, string> = {
    "SPES Form 2": "spes_form2",
    "SPES Form 2A": "spes_form2a",
    "SPES Form 4": "spes_form4",
    "Passport Photo": "passport_picture",
    "Birth Certificate": "birth_certificate",
    "Certificate of Indigency": "certificate_of_indigency",
    "Certificate of Registration": "certificate_of_registration",
    "Certificate of Grades": "certificate_of_grades",
    "PhilJobNet Screenshot": "philjobnet_screenshot",
};

const guessMime = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    return "image/jpeg";
};

export default function DocumentsReview() {
    const token = localStorage.getItem("token") || "";

    const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [programFilter, setProgramFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Export state
    const [exportingUserId, setExportingUserId] = useState<number | null>(null);

    // Document preview
    const [previewDoc, setPreviewDoc] = useState<UnifiedDocument | null>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<UnifiedDocument | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Replace (edit) state
    const [replacingId, setReplacingId] = useState<string | null>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);

    /* Flatten SPES rows into UnifiedDocument[] */
    const flattenSpes = (spesDocs: SpesDocumentRecord[]): UnifiedDocument[] => {
        const result: UnifiedDocument[] = [];
        for (const row of spesDocs) {
            for (const [label, url] of Object.entries(row.documents)) {
                if (!url) continue;
                const fieldId = SPES_LABEL_TO_FIELD[label] || label;
                const fileName = url.split("/").pop() || label;
                result.push({
                    id: `spes-${row.spes_application_id}-${fieldId}`,
                    kind: "spes",
                    user_id: row.user_id,
                    user_name: row.user_name,
                    email: row.email,
                    program_type: "spes",
                    document_type_label: label,
                    original_name: fileName,
                    file_size: null,
                    mime_type: guessMime(url),
                    uploaded_at: row.updated_at,
                    url,
                    spes_application_id: row.spes_application_id,
                    spes_field_id: fieldId,
                });
            }
        }
        return result;
    };

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const isSpes = programFilter === "spes";
            const isAll = !programFilter;

            let genericDocs: UnifiedDocument[] = [];
            let spesDocs: UnifiedDocument[] = [];

            // Fetch generic docs (skip if filtering to SPES only)
            if (!isSpes) {
                const raw = await adminDocumentsApi.getAllDocuments(token, {
                    programType: programFilter || undefined,
                });
                genericDocs = raw.map((d) => ({
                    id: `gen-${d.document_id}`,
                    kind: "generic" as const,
                    user_id: d.user_id,
                    user_name: d.user_name,
                    email: d.email,
                    program_type: d.program_type,
                    document_type_label: d.document_type_label,
                    original_name: d.original_name,
                    file_size: d.file_size,
                    mime_type: d.mime_type,
                    uploaded_at: d.uploaded_at,
                    url: d.url,
                    document_id: d.document_id,
                }));
            }

            // Fetch SPES docs (when filter is All or SPES)
            if (isAll || isSpes) {
                const rawSpes = await adminDocumentsApi.getAllSpesDocuments(token);
                spesDocs = flattenSpes(rawSpes);
            }

            setDocuments([...genericDocs, ...spesDocs]);
        } catch (err: any) {
            console.error("Error fetching documents:", err);
            setError(err?.response?.data?.message || "Failed to load documents");
        } finally {
            setLoading(false);
        }
    }, [token, programFilter]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Filtered docs
    const filteredDocs = documents.filter((doc) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            doc.user_name.toLowerCase().includes(q) ||
            doc.email?.toLowerCase().includes(q) ||
            doc.document_type_label.toLowerCase().includes(q) ||
            doc.original_name.toLowerCase().includes(q) ||
            doc.program_type.toLowerCase().includes(q)
        );
    });

    // Group by user for export buttons (generic-only since Word export is for generic docs)
    const genericDocs = filteredDocs.filter((d) => d.kind === "generic");
    const userIds = [...new Set(genericDocs.map((d) => d.user_id))];
    const usersMap = new Map<number, string>();
    genericDocs.forEach((d) => usersMap.set(d.user_id, d.user_name));

    /* ── Handlers ── */

    const handleExportWord = async (userId: number) => {
        setExportingUserId(userId);
        try {
            const blob = await adminDocumentsApi.exportToWord(token, userId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const userName = usersMap.get(userId) || "User";
            const safeName = userName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_");
            a.download = `Document_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            alert("Failed to export documents to Word");
        } finally {
            setExportingUserId(null);
        }
    };

    const getDocUrl = (doc: UnifiedDocument) => {
        if (doc.kind === "spes") return `${API_BASE_URL}${doc.url}`;
        return `${API_BASE_URL}${doc.url}`;
    };

    const handleViewDocument = (doc: UnifiedDocument) => setPreviewDoc(doc);
    const closePreview = () => setPreviewDoc(null);

    /* Print current preview */
    const handlePrint = (doc: UnifiedDocument) => {
        const url = getDocUrl(doc);
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
        } else {
            printWindow.location.href = url;
        }
        printWindow.document.close();
    };

    /* Delete */
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            if (deleteTarget.kind === "generic" && deleteTarget.document_id) {
                await adminDocumentsApi.deleteDocument(token, deleteTarget.document_id);
            } else if (deleteTarget.kind === "spes" && deleteTarget.spes_application_id && deleteTarget.spes_field_id) {
                await adminDocumentsApi.deleteSpesDocument(token, deleteTarget.spes_application_id, deleteTarget.spes_field_id);
            }
            setDeleteTarget(null);
            fetchDocuments();
        } catch {
            alert("Failed to delete document");
        } finally {
            setDeleting(false);
        }
    };

    /* Replace / Edit */
    const startReplace = (doc: UnifiedDocument) => {
        setReplacingId(doc.id);
        setTimeout(() => replaceInputRef.current?.click(), 50);
    };

    const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !replacingId) {
            setReplacingId(null);
            return;
        }

        const doc = documents.find((d) => d.id === replacingId);
        if (!doc) { setReplacingId(null); return; }

        try {
            if (doc.kind === "generic" && doc.document_id) {
                await adminDocumentsApi.replaceDocument(token, doc.document_id, file);
            } else if (doc.kind === "spes" && doc.spes_application_id && doc.spes_field_id) {
                await adminDocumentsApi.replaceSpesDocument(token, doc.spes_application_id, doc.spes_field_id, file);
            }
            fetchDocuments();
        } catch {
            alert("Failed to replace document");
        } finally {
            setReplacingId(null);
            if (replaceInputRef.current) replaceInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-6">
            {/* Hidden file input for replace */}
            <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleReplaceFile}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Documents Review</h1>
                    <p className="text-sm text-gray-500">
                        View, edit, delete, and print submitted documents across all programs
                    </p>
                </div>
                <div className="text-sm text-gray-500">
                    {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""} found
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, document type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                        value={programFilter}
                        onChange={(e) => setProgramFilter(e.target.value)}
                        className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none cursor-pointer"
                    >
                        {PROGRAM_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Export Section - grouped by user */}
            {userIds.length > 0 && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
                    <h3 className="text-sm font-semibold text-teal-900 mb-3 flex items-center gap-2">
                        <FileDown size={16} />
                        Export Documents to Word (for DOLE submission)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {userIds.map((uid) => (
                            <button
                                key={uid}
                                onClick={() => handleExportWord(uid)}
                                disabled={exportingUserId === uid}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-teal-200 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
                            >
                                <Download size={14} />
                                {exportingUserId === uid
                                    ? "Exporting..."
                                    : `${usersMap.get(uid) || "User #" + uid}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16">
                    <Loader className="animate-spin text-teal-600" size={28} />
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Documents Table */}
            {!loading && !error && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Applicant</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Program</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Document</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">File</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Size</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Uploaded</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDocs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                            <FileText size={32} className="mx-auto mb-2 opacity-40" />
                                            No documents found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDocs.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{doc.user_name}</div>
                                                <div className="text-xs text-gray-400">{doc.email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 uppercase">
                                                    {doc.program_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">{doc.document_type_label}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-gray-900 truncate max-w-[180px]" title={doc.original_name}>
                                                    {doc.original_name}
                                                </div>
                                                <div className="text-xs text-gray-400">{doc.mime_type}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{formatFileSize(doc.file_size)}</td>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {formatDate(doc.uploaded_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleViewDocument(doc)}
                                                        className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors"
                                                        title="Preview"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <a
                                                        href={getDocUrl(doc)}
                                                        download={doc.original_name}
                                                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                    <button
                                                        onClick={() => handlePrint(doc)}
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Print"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => startReplace(doc)}
                                                        disabled={replacingId === doc.id}
                                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                                        title="Replace file"
                                                    >
                                                        <RefreshCw size={16} className={replacingId === doc.id ? "animate-spin" : ""} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(doc)}
                                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h3 className="font-semibold text-gray-900">{previewDoc.document_type_label}</h3>
                                <p className="text-xs text-gray-500">
                                    {previewDoc.user_name} &middot; {previewDoc.original_name}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePrint(previewDoc)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    <Printer size={14} /> Print
                                </button>
                                <a
                                    href={getDocUrl(previewDoc)}
                                    download={previewDoc.original_name}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                    <Download size={14} /> Download
                                </a>
                                <button
                                    onClick={closePreview}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-4">
                            {previewDoc.mime_type?.startsWith("image/") ? (
                                <img
                                    src={getDocUrl(previewDoc)}
                                    alt={previewDoc.original_name}
                                    className="max-w-full h-auto mx-auto rounded-lg"
                                />
                            ) : previewDoc.mime_type === "application/pdf" ? (
                                <iframe
                                    src={getDocUrl(previewDoc)}
                                    className="w-full h-[70vh] rounded-lg border"
                                    title={previewDoc.original_name}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <FileText size={48} className="mb-3 opacity-40" />
                                    <p className="text-sm">Preview is not available for this file type.</p>
                                    <a
                                        href={getDocUrl(previewDoc)}
                                        download={previewDoc.original_name}
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                        <Download size={16} /> Download to view
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Document</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete this document?
                        </p>
                        <div className="text-sm bg-red-50 rounded-lg p-3 mb-4 border border-red-100">
                            <div className="font-medium text-red-900">{deleteTarget.document_type_label}</div>
                            <div className="text-red-700 text-xs mt-0.5">
                                {deleteTarget.user_name} &middot; {deleteTarget.original_name}
                            </div>
                        </div>
                        <p className="text-xs text-red-500 mb-4">
                            This action cannot be undone. The file will be permanently removed.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
