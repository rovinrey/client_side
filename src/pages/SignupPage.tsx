import { useState } from "react";
import axios, { AxiosError } from "axios";
import PesoLogo from '../components/PesoLogo';
import OTPVerificationPage from './OTPVerificationPage';
import { Link, useNavigate } from "react-router-dom";

import { API_BASE_URL } from '../api/config';
import { requestOTP } from '../api/otp.api';

const NAME_REGEX = /^[a-zA-Z\s.\-']+$/;

function SignupPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showOTPVerification, setShowOTPVerification] = useState(false);
    const [formData, setFormData] = useState({
        user_name: "",
        identifier: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const validate = (): string | null => {
        const trimmedName = formData.user_name.trim();
        const trimmedIdentifier = formData.identifier.trim();

        if (!trimmedName || !trimmedIdentifier || !formData.password || !formData.confirmPassword) {
            return "Please fill in all fields.";
        }

        if (trimmedName.length < 2 || trimmedName.length > 100) {
            return "Full name must be between 2 and 100 characters.";
        }

        if (!NAME_REGEX.test(trimmedName)) {
            return "Full name contains invalid characters.";
        }

        if (formData.password.length < 8) {
            return "Password must be at least 8 characters long.";
        }

        if (formData.password !== formData.confirmPassword) {
            return "Invalid credentials.";
        }

        return null;
    };

    const handleSignupStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setIsLoading(true);
            // Request OTP - this will initiate the verification flow
            await requestOTP(formData.identifier, formData.user_name);
            setShowOTPVerification(true);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to request verification. Please try again.";
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPVerified = async (verified: boolean) => {
        if (!verified) {
            setError("OTP verification failed. Please try again.");
            return;
        }

        try {
            setIsLoading(true);
            // Complete signup after OTP verification
            await axios.post(`${API_BASE_URL}/api/auth/signup`, {
                user_name: formData.user_name.trim(),
                identifier: formData.identifier.trim(),
                password: formData.password,
                role: "beneficiary",
            });

            setSuccess("Account created successfully! Redirecting to login…");
            setFormData({ user_name: "", identifier: "", password: "", confirmPassword: "" });

            setTimeout(() => navigate("/login", { replace: true }), 1500);
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                setError(err.response?.data?.message || "Failed to create account. Please try again.");
            } else {
                setError("An unexpected error occurred.");
            }
            setShowOTPVerification(false);
        } finally {
            setIsLoading(false);
        }
    };

    // OTP Verification Page
    if (showOTPVerification) {
        return (
            <OTPVerificationPage
                identifier={formData.identifier.trim()}
                userName={formData.user_name.trim()}
                onVerified={handleOTPVerified}
                onBack={() => {
                    setShowOTPVerification(false);
                    setError(null);
                }}
            />
        );
    }

    const inputClass =
        "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-teal-700 mt-6">
                <div className="text-center mb-4">
                    <PesoLogo size="md" className="mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Public Employment Service Office — Juban</p>
                </div>

                <h3 className="text-2xl font-black text-center mb-8 uppercase tracking-tight text-gray-800">
                    Create Account
                </h3>

                {error && (
                    <div role="alert" className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">
                        {error}
                    </div>
                )}

                {success && (
                    <div role="status" className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm font-medium">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSignupStep1} className="space-y-5" noValidate>
                    <div>
                        <label htmlFor="user_name" className="sr-only">Full Name</label>
                        <input
                            id="user_name"
                            type="text"
                            name="user_name"
                            placeholder="Full Name"
                            value={formData.user_name}
                            onChange={handleChange}
                            required
                            autoComplete="name"
                            maxLength={100}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="identifier" className="sr-only">Email or Phone Number</label>
                        <input
                            id="identifier"
                            type="text"
                            name="identifier"
                            placeholder="Email or Phone Number"
                            value={formData.identifier}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                            maxLength={254}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            type="text"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                            maxLength={128}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                            maxLength={128}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "REGISTERING…" : "REGISTER NOW"}
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-600">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="text-teal-700 font-bold hover:underline"
                    >
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default SignupPage;