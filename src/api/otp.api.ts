import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * OTP API Service
 * Handles all OTP-related API calls
 */

const OTP_API = `${API_BASE_URL}/api/auth/otp`;

export interface RequestOTPResponse {
  message: string;
  otpId: number;
  identifier: string;
}

export interface VerifyOTPResponse {
  message: string;
  otpId: number;
  verified: boolean;
}

/**
 * Request OTP - Send verification code to email or phone
 */
export const requestOTP = async (
  identifier: string,
  userName?: string
): Promise<RequestOTPResponse> => {
  try {
    const response = await axios.post(`${OTP_API}/request`, {
      identifier: identifier.trim(),
      user_name: userName,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to request OTP. Please try again.'
      );
    }
    throw error;
  }
};

/**
 * Verify OTP - Validate the OTP code
 */
export const verifyOTP = async (
  identifier: string,
  otpCode: string
): Promise<VerifyOTPResponse> => {
  try {
    const response = await axios.post(`${OTP_API}/verify`, {
      identifier: identifier.trim(),
      otp_code: otpCode.trim(),
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Invalid OTP. Please try again.'
      );
    }
    throw error;
  }
};

/**
 * Resend OTP - Request a new OTP code with cooldown
 */
export const resendOTP = async (
  identifier: string,
  userName?: string
): Promise<RequestOTPResponse> => {
  try {
    const response = await axios.post(`${OTP_API}/resend`, {
      identifier: identifier.trim(),
      user_name: userName,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to resend OTP. Please try again.'
      );
    }
    throw error;
  }
};
