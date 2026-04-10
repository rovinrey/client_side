import axios from 'axios';

import { API_BASE_URL } from './config';

const BASE_URL = `${API_BASE_URL}/api/documents`;

export interface UploadedDocument {
    document_id: number;
    document_type: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    url: string;
}

export interface ProgramDocumentStatus {
    total_required: number;
    submitted_count: number;
    is_complete: boolean;
    documents: UploadedDocument[];
    missing: string[];
}

export interface AllProgramsStatusResponse {
    programs: Record<string, ProgramDocumentStatus>;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

const documentsApi = {
    getDocuments: async (token: string, programType: string): Promise<UploadedDocument[]> => {
        const { data } = await axios.get<{ documents: UploadedDocument[] }>(
            `${BASE_URL}/${programType}`,
            { headers: authHeader(token) }
        );
        return data.documents;
    },

    uploadDocument: async (
        token: string,
        programType: string,
        documentType: string,
        file: File,
        onProgress?: (pct: number) => void
    ): Promise<UploadedDocument> => {
        const form = new FormData();
        form.append('document', file);
        form.append('program_type', programType);
        form.append('document_type', documentType);

        const { data } = await axios.post<UploadedDocument>(`${BASE_URL}/upload`, form, {
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

    deleteDocument: async (token: string, documentId: number): Promise<void> => {
        await axios.delete(`${BASE_URL}/${documentId}`, {
            headers: authHeader(token),
        });
    },

    getAllProgramStatus: async (token: string): Promise<AllProgramsStatusResponse> => {
        const { data } = await axios.get<AllProgramsStatusResponse>(
            `${BASE_URL}/status/all`,
            { headers: authHeader(token) }
        );
        return data;
    },
};

export default documentsApi;
