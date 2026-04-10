import axios from 'axios';
import { API_BASE_URL } from './config';

const BASE_URL = `${API_BASE_URL}/api/spes-documents`;

export type DocumentFieldId =
    | 'passport_picture'
    | 'birth_certificate'
    | 'certificate_of_indigency'
    | 'certificate_of_registration'
    | 'certificate_of_grades'
    | 'philjobnet_screenshot';

export type ApplicationStatus = 'Draft' | 'Pending' | 'Approved' | null;

export interface DocumentStatusResponse {
    application_status: ApplicationStatus;
    documents: Record<DocumentFieldId, string | null>;
    record_id: number | null;
}

export interface UploadDocumentResponse {
    message: string;
    field_id: DocumentFieldId;
    url: string;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

const spesDocumentsApi = {
    getStatus: async (token: string): Promise<DocumentStatusResponse> => {
        const { data } = await axios.get<DocumentStatusResponse>(`${BASE_URL}/status`, {
            headers: authHeader(token),
        });
        return data;
    },

    uploadDocument: async (
        token: string,
        fieldId: DocumentFieldId,
        file: File,
        onProgress?: (pct: number) => void
    ): Promise<UploadDocumentResponse> => {
        const form = new FormData();
        form.append('document', file);
        form.append('field_id', fieldId);

        const { data } = await axios.post<UploadDocumentResponse>(`${BASE_URL}/upload`, form, {
            headers: {
                ...authHeader(token),
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (event) => {
                if (onProgress && event.total) {
                    onProgress(Math.round((event.loaded * 100) / event.total));
                }
            },
        });
        return data;
    },

    deleteDocument: async (token: string, fieldId: DocumentFieldId): Promise<void> => {
        await axios.delete(`${BASE_URL}/${fieldId}`, {
            headers: authHeader(token),
        });
    },
};

export default spesDocumentsApi;
