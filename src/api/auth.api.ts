import axios from 'axios';
import { API_BASE_URL } from './config';

export interface CreateUserData {
    user_name: string;
    identifier: string;
    password: string;
    role: 'admin' | 'staff';
}

export const createUser = async (userData: CreateUserData): Promise<{ message: string }> => {
const token = localStorage.getItem('token');
    
    const response = await axios.post(
        `${API_BASE_URL}/api/auth/create-user`,
        userData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );
    
    return response.data;
};
