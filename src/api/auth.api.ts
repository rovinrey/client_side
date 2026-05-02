import axios from 'axios';
import { API_BASE_URL } from './config';
import { storageGet } from '../utils/storage';

// Create a dedicated Axios instance for Auth operations
const BASE_URL = API_BASE_URL || 'https://serverside-production-9b74.up.railway.app';
const api = axios.create({
    baseURL: `${BASE_URL}/api/auth`,
    withCredentials: true,
});

// Automatically attach the token to every request
api.interceptors.request.use(
    (config) => {
        const token = storageGet('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export interface CreateUserData {
    user_name: string;
    identifier: string;
    password: string;
    role: 'admin' | 'staff';
}

export const createUser = async (userData: CreateUserData): Promise<{ message: string }> => {
    // Directly use the interceptor-configured api instance
    const response = await api.post<{ message: string }>('/create-user', userData);
    return response.data;
};

export default createUser;