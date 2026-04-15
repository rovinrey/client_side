import axios from 'axios';

import { API_BASE_URL } from './config';
const BASE_URL = `${API_BASE_URL}/api/admin/documents`;

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface AdminDocument {
    document_id: number;
    user_id: number;
    user_name: string;
    email: string;
    program_type: string;
    document_type: string;
    document_type_label: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    url: string;
}

export interface SpesDocumentRecord {
    spes_application_id: number;
    user_id: number;
    user_name: string;
    email: string;
    application_status: string;
    documents: Record<string, string | null>;
    admin_remarks: string | null;
    updated_at: string;
}

const adminDocumentsApi = {
    /** Get all submitted documents (optionally filtered by programType or userId) */
    getAllDocuments: async (
        token: string,
        filters?: { programType?: string; userId?: number }
    ): Promise<AdminDocument[]> => {
        const params: Record<string, string> = {};
        if (filters?.programType) params.programType = filters.programType;
        if (filters?.userId) params.userId = String(filters.userId);

        const { data } = await axios.get<{ documents: AdminDocument[] }>(BASE_URL, {
            headers: authHeader(token),
            params,
        });
        return data.documents;
    },

    /** Get all SPES documents */
    getAllSpesDocuments: async (
        token: string,
        userId?: number
    ): Promise<SpesDocumentRecord[]> => {
        const params: Record<string, string> = {};
        if (userId) params.userId = String(userId);

        const { data } = await axios.get<{ spes_documents: SpesDocumentRecord[] }>(
            `${BASE_URL}/spes`,
            { headers: authHeader(token), params }
        );
        return data.spes_documents;
    },

    /** Download a user's documents as a Word file */
    exportToWord: async (token: string, userId: number): Promise<Blob> => {
        const { data } = await axios.get(`${BASE_URL}/export-word/${userId}`, {
            headers: authHeader(token),
            responseType: 'blob',
        });
        return data;
    },

    /** Get direct view URL for a generic document */
    getViewUrl: (documentId: number) => `${BASE_URL}/view/${documentId}`,

    /** Get direct view URL for a SPES document */
    getSpesViewUrl: (applicationId: number, fieldId: string) =>
        `${BASE_URL}/spes/view/${applicationId}/${fieldId}`,

    /** Delete a generic beneficiary document */
    deleteDocument: async (token: string, documentId: number): Promise<void> => {
        await axios.delete(`${BASE_URL}/${documentId}`, {
            headers: authHeader(token),
        });
    },

    /** Delete a SPES document */
    deleteSpesDocument: async (
        token: string,
        applicationId: number,
        fieldId: string
    ): Promise<void> => {
        await axios.delete(`${BASE_URL}/spes/${applicationId}/${fieldId}`, {
            headers: authHeader(token),
        });
    },

    /** Replace a generic beneficiary document file */
    replaceDocument: async (
        token: string,
        documentId: number,
        file: File
    ): Promise<void> => {
        const formData = new FormData();
        formData.append('document', file);
        await axios.put(`${BASE_URL}/${documentId}`, formData, {
            headers: { ...authHeader(token), 'Content-Type': 'multipart/form-data' },
        });
    },

    /** Replace a SPES document file */
    replaceSpesDocument: async (
        token: string,
        applicationId: number,
        fieldId: string,
        file: File
    ): Promise<void> => {
        const formData = new FormData();
        formData.append('document', file);
        await axios.put(`${BASE_URL}/spes/${applicationId}/${fieldId}`, formData, {
            headers: { ...authHeader(token), 'Content-Type': 'multipart/form-data' },
        });
    },
};

export default adminDocumentsApi;
