import axios from 'axios';
import { API_BASE_URL } from './config';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Notification {
    notification_id: number;
    title: string;
    message: string;
    type: 'program_available' | 'program_ongoing' | 'program_coming_soon' | 'program_completed' | 'general';
    is_read: number;
    created_at: string;
    program_id: number | null;
    program_name: string | null;
    program_status: string | null;
    start_date: string | null;
    end_date: string | null;
}

export const getNotifications = async (limit = 20, offset = 0): Promise<Notification[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: getAuthHeaders(),
        params: { limit, offset },
    });
    return data;
};

export const getUnreadCount = async (): Promise<number> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: getAuthHeaders(),
    });
    return data.count;
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
    await axios.patch(`${API_BASE_URL}/api/notifications/${id}/read`, null, {
        headers: getAuthHeaders(),
    });
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    await axios.patch(`${API_BASE_URL}/api/notifications/read-all`, null, {
        headers: getAuthHeaders(),
    });
};
