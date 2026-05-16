import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertCircle, Rocket } from "lucide-react";
import { API_BASE_URL } from '../../api/config';
import { storageGet } from '../../utils/storage';
import { logout } from '../../utils/auth';

import WelcomeBanner from "../../components/Welcomebanner";
import { programsAPI, type ActiveProgram } from '../../api/programs.api';

function BeneficiaryDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [readyPrograms, setReadyPrograms] = useState<ActiveProgram[]>([]);
    const [readyLoading, setReadyLoading] = useState(true);

    const fetchReadyPrograms = useCallback(async () => {
        try {
            const programs = await programsAPI.getReadyPrograms();
            const availablePrograms = programs.filter(
                (program) => (program.slots - (program.filled || 0)) > 0
            );
            setReadyPrograms(availablePrograms);
        } catch (err) {
            console.error('Failed to load ready programs:', err);
        } finally {
            setReadyLoading(false);
        }
    }, []);

useEffect(() => {
        const fetchDashboardData = async () => {
            const token = storageGet('token');
            const role = storageGet('role');

            if (!token || role !== 'beneficiary') {
                navigate('/login');
                return;
            }

            try {
                const profileRes = await axios.get(
                    `${API_BASE_URL}/api/auth/getProfile`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setUser(profileRes.data);
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    logout();
                    navigate('/login');
                    return;
                }
                setError("Unable to load profile data.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        fetchReadyPrograms();
    }, [navigate, fetchReadyPrograms]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-teal-600 border-solid" />
                    <span className="text-gray-500 font-medium">Loading Dashboard…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load dashboard</h2>
                    <p className="text-gray-600 mb-6 text-sm">{error}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors text-sm"
                        >
                            Retry
                        </button>

                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            className="text-sm text-gray-500 hover:text-teal-600 font-medium"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

   
    return (
        <div className="w-full">
            {/* Welcome Banner */}
            <div className="w-full px-1 sm:px-2 md:px-4">
                <WelcomeBanner text={`Welcome, ${user?.first_name || user?.user_name || 'User'}!`} />
            </div>

            <main className="pb-8 md:pb-12 w-full px-1 sm:px-2 md:px-4 lg:px-8 max-w-7xl mx-auto mt-4 space-y-6">
                {/* Ready Programs Section */}
                {!readyLoading && readyPrograms.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl shadow-sm border border-emerald-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                <Rocket className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Ready Programs</h2>
                                <p className="text-sm text-emerald-700">Apply now – these programs are accepting applicants</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {readyPrograms.map((program) => (
                                <div
                                    key={program.program_id}
                                    className="group bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer"
                                    onClick={() => navigate('/beneficiary/application', { state: { programId: program.program_id } })}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 pr-4">{program.program_name}</h3>
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-full tracking-wide">
                                            {program.slots - (program.filled || 0)} slots
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{program.location}</p>
                                    {program.start_date && (
                                        <p className="text-xs text-gray-500 mb-4">
                                            Starts {new Date(program.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div 
                                                className="bg-emerald-500 h-2 rounded-full transition-all" 
                                                style={{ width: `${Math.min(100, ((program.filled || 0) / program.slots) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {program.filled || 0}/{program.slots}
                                        </span>
                                    </div>
                                    <button className="w-full mt-4 bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors group-hover:shadow-lg">
                                        Apply Now →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
        
            </main>
        </div>
    );
}

export default BeneficiaryDashboard;