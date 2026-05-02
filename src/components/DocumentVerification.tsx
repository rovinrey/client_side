import React, { useState } from "react";
import { CheckCircle, XCircle, Eye, Loader, AlertCircle, Clock } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../api/config';
import { storageGet } from '../utils/storage';

// Senior Note: Updated interface to match the SQL ENUM status
interface Document {
    document_id: number;
    document_type: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    status: 'pending' | 'verified' | 'rejected'; // Changed from is_verified
    verified_by: number | null;
    verified_at: string | null;
    remarks: string | null; // Added to show rejection reasons
    url: string;
}

interface DocumentVerificationProps {
    applicationId: number;
    documents: Document[];
    userRole?: string;
    onVerificationChange?: () => void;
}

const DocumentVerification: React.FC<DocumentVerificationProps> = ({
    documents,
    userRole,
    onVerificationChange,
}) => {
    const [verifying, setVerifying] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const token = storageGet("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const canVerify = userRole === 'admin' || userRole === 'staff';

    const handleVerify = async (documentId: number) => {
        setVerifying(documentId);
        setError(null);
        try {
            await axios.put(
                `${API_BASE_URL}/api/admin/documents/${documentId}/verify`,
                {},
                { headers }
            );
            onVerificationChange?.();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to verify document");
        } finally {
            setVerifying(null);
        }
    };

    const handleReject = async (documentId: number) => {
        const reason = prompt("Enter reason for rejection (optional):");
        if (reason === null) return;

        setRejecting(documentId);
        setError(null);
        try {
            await axios.put(
                `${API_BASE_URL}/api/admin/documents/${documentId}/reject`,
                { reason: reason || "Document does not meet requirements" },
                { headers }
            );
            onVerificationChange?.();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to reject document");
        } finally {
            setRejecting(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const verifiedCount = documents.filter(d => d.status === 'verified').length;
    const totalCount = documents.length;

    if (documents.length === 0) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 border border-dashed border-gray-300">
                No documents submitted yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Bar */}
            <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-gray-700">
                    Verification Progress: <span className="text-blue-600">{verifiedCount}/{totalCount}</span>
                </span>
                <div className="w-32 bg-gray-200 rounded-full h-1.5">
                    <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(verifiedCount/totalCount)*100}%` }}
                    />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 animate-in fade-in duration-300">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid gap-3">
                {documents.map((doc) => (
                    <div key={doc.document_id} className="group relative border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    {doc.document_type.replace(/_/g, " ").toUpperCase()}
                                </h4>
                                <p className="text-xs text-gray-500 truncate mt-1 italic">{doc.original_name}</p>
                                
                                <div className="flex gap-3 mt-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                                    <span>{formatFileSize(doc.file_size)}</span>
                                    <span>•</span>
                                    <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                                </div>

                                {/* Status Badge Logic */}
                                <div className="mt-3">
                                    {doc.status === 'verified' ? (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-fit border border-green-100">
                                            <CheckCircle size={12} /> VERIFIED
                                        </div>
                                    ) : doc.status === 'rejected' ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full w-fit border border-red-100">
                                                <XCircle size={12} /> REJECTED
                                            </div>
                                            {doc.remarks && <p className="text-[10px] text-red-500 ml-1">Reason: {doc.remarks}</p>}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full w-fit border border-amber-100">
                                            <Clock size={12} /> PENDING REVIEW
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                    title="Preview File"
                                >
                                    <Eye size={18} />
                                </a>

                                {canVerify && doc.status === 'pending' && (
                                    <div className="flex flex-col gap-2 border-t pt-2 border-gray-100 mt-1">
                                        <button
                                            onClick={() => handleVerify(doc.document_id)}
                                            disabled={!!verifying}
                                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30"
                                            title="Approve"
                                        >
                                            {verifying === doc.document_id ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        </button>
                                        <button
                                            onClick={() => handleReject(doc.document_id)}
                                            disabled={!!rejecting}
                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                            title="Reject"
                                        >
                                            {rejecting === doc.document_id ? <Loader size={18} className="animate-spin" /> : <XCircle size={18} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DocumentVerification;