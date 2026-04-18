import React, { useState, useEffect } from 'react';
import OTPInput from '../components/OTPInput';
import { requestOTP, verifyOTP, resendOTP } from '../api/otp.api';

interface OTPVerificationPageProps {
  identifier: string;
  userName: string;
  onVerified: (verified: boolean) => void;
  onBack: () => void;
}

/**
 * OTP Verification Page
 * Handles the complete OTP verification flow
 * - Request OTP on mount
 * - Display OTP input
 * - Verify OTP with retry logic
 * - Resend OTP with cooldown
 */
const OTPVerificationPage: React.FC<OTPVerificationPageProps> = ({
  identifier,
  userName,
  onVerified,
  onBack,
}) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpRequested, setOtpRequested] = useState(false);

  // Request OTP on component mount
  useEffect(() => {
    const initializeOTP = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await requestOTP(identifier, userName);
        setMaskedIdentifier(response.identifier);
        setOtpRequested(true);
        console.log('✅ OTP requested successfully');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to request OTP';
        setError(errorMsg);
        console.error('❌ Failed to request OTP:', errorMsg);
      } finally {
        setLoading(false);
      }
    };

    initializeOTP();
  }, [identifier, userName]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);
      await verifyOTP(identifier, otp);
      console.log('✅ OTP verified successfully');
      onVerified(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMsg);
      setOtp(''); // Clear OTP on error
      console.error('❌ OTP verification failed:', errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setError(null);
      setOtp('');
      setLoading(true);
      await resendOTP(identifier, userName);
      setResendCooldown(60); // 60 second cooldown
      console.log('✅ OTP resent successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resend OTP';
      setError(errorMsg);
      console.error('❌ Failed to resend OTP:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-b-8 border-teal-700">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
          <p className="text-sm text-slate-600">
            We sent a verification code to {' '}
            <span className="font-semibold text-teal-700">{maskedIdentifier || 'your email'}</span>
          </p>
        </div>

        {/* Loading State - Initial OTP Request */}
        {loading && !otpRequested && (
          <div className="text-center py-8">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
            </div>
            <p className="text-gray-600 mt-4">Sending verification code...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && otpRequested && (
          <>
            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6"
              >
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* OTP Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                Enter 6-digit code
              </label>
              <OTPInput
                length={6}
                onChange={(value) => setOtp(value)}
                onComplete={handleVerifyOTP}
                disabled={isVerifying}
              />
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || isVerifying}
              className={`
                w-full py-3 rounded-lg font-semibold transition-all duration-200
                ${
                  otp.length !== 6 || isVerifying
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
                }
              `}
            >
              {isVerifying ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Verifying...
                </span>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend Section */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">Didn't receive the code?</p>
              <button
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className={`
                  text-sm font-semibold transition-all duration-200
                  ${
                    resendCooldown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-teal-700 hover:text-teal-800 hover:underline'
                  }
                `}
              >
                {resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  'Resend Code'
                )}
              </button>
            </div>

            {/* Tips Section */}
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> You can paste the code directly into the input field
              </p>
            </div>

            {/* Back Button */}
            <button
              onClick={onBack}
              className="w-full mt-6 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Sign Up
            </button>
          </>
        )}
      </div>

      {/* Additional Info */}
      <p className="text-xs text-gray-500 text-center mt-6">
        🔒 Your data is encrypted and secure. This verification helps protect your account.
      </p>
    </div>
  );
};

export default OTPVerificationPage;
