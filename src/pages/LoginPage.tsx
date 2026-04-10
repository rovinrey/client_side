import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { setAuth } from "../utils/auth";

import { API_BASE_URL } from '../api/config';

const ROLE_REDIRECTS: Record<string, string> = {
    admin: "/admin",
    staff: "/staff",
    beneficiary: "/beneficiary",
};

function Login() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [credentials, setCredentials] = useState({
        username: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedIdentifier = credentials.username.trim();
        if (!trimmedIdentifier || !credentials.password) {
            setError("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/auth/login`,
                {
                    identifier: trimmedIdentifier,
                    password: credentials.password,
                }
            );

            const { token, role, user } = response.data;

            if (!token || !role || !user) {
                throw new Error("Invalid server response.");
            }

            const userRole = role.toLowerCase();
            const userId = user.id || user.user_id;

            if (!userId) {
                throw new Error("Invalid server response.");
            }

            if (!(userRole in ROLE_REDIRECTS)) {
                throw new Error("Invalid role.");
            }

            setAuth(token, userRole as "admin" | "beneficiary" | "staff");
            localStorage.setItem("user_name", user.user_name);
            localStorage.setItem("user_id", String(userId));

            navigate(ROLE_REDIRECTS[userRole], { replace: true });
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                setError(err.response?.data?.message || "Unable to connect. Please try again.");
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-b-8 border-teal-700">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-black text-amber-500 tracking-tight">PESO</h2>
                    <p className="text-sm text-slate-500 font-medium">Public Employment Service Office — Juban</p>
                </div>

                <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    Sign In
                </h3>

                {error && (
                    <div role="alert" className="text-red-500 text-center text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor="username" className="sr-only">
                            Email or Phone
                        </label>
                        <input
                            id="username"
                            type="text"
                            name="username"
                            placeholder="Email or Phone"
                            value={credentials.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                            maxLength={254}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="sr-only">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={credentials.password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                            maxLength={128}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-lg mt-4 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Signing in…" : "LOGIN"}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm">
                    Don't have an account?{" "}
                    <Link
                        to="/signup"
                        className="text-teal-700 font-bold hover:underline"
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;