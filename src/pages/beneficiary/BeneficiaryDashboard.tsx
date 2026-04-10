import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertCircle, Rocket, Clock, CheckCircle2, Megaphone, Info } from "lucide-react";
import { API_BASE_URL } from '../../api/config';

import WelcomeBanner from "../../components/Welcomebanner";
import RequirementsSubmissionModule from "../../components/RequirementsSubmissionModule";
import { getNotifications, markNotificationAsRead, type Notification } from '../../api/notifications.api';
import { type ProgramKey } from '../../constants/beneficiaryPrograms';

const PROGRAM_NAME_TO_KEY: Record<string, ProgramKey> = {
    tupad: 'TUPAD',
    spes: 'SPES',
    dilp: 'DILP',
    gip: 'GIP',
    job_seekers: 'JOBSEEKERS',
};

function BeneficiaryDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await getNotifications(10);
            setNotifications(data);
        } catch {
            // silent fail — notifications are non-critical
        }
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

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
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
                setError("Unable to load profile data.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        fetchNotifications();
    }, [navigate, fetchNotifications]);

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
                            onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
                            className="text-sm text-gray-500 hover:text-teal-600 font-medium"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleMarkRead = async (id: number) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.notification_id === id ? { ...n, is_read: 1 } : n))
            );
        } catch {
            // silent
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) handleMarkRead(notif.notification_id);

        if (notif.program_name) {
            const programKey = PROGRAM_NAME_TO_KEY[notif.program_name.toLowerCase()];
            if (programKey) {
                navigate('/beneficiary/application', { state: { program: programKey } });
                return;
            }
        }
    };

    const typeConfig: Record<string, { icon: typeof Rocket; color: string; bg: string; label: string }> = {
        program_available: { icon: Rocket, color: 'text-green-600', bg: 'bg-green-50', label: 'Open for Applications' },
        program_ongoing: { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ongoing' },
        program_coming_soon: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Coming Soon' },
        program_completed: { icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Completed' },
        general: { icon: Info, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Announcement' },
    };

    return (
        <div className="w-full">
            {/* Welcome Banner */}
            <div className="w-full px-1 sm:px-2 md:px-4">
                <WelcomeBanner text={`Welcome, ${user?.first_name || user?.user_name || 'User'}!`} />
            </div>

            <main className="pb-8 md:pb-12 w-full px-1 sm:px-2 md:px-4 lg:px-8 max-w-7xl mx-auto mt-4 space-y-6">
                {/* Program Announcements */}
                {notifications.length > 0 && (
                    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Program Announcements</h2>
                        <div className="space-y-3">
                            {notifications.map((notif) => {
                                const config = typeConfig[notif.type] || typeConfig.general;
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={notif.notification_id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`flex gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                                            notif.is_read
                                                ? 'border-gray-100 bg-white hover:bg-gray-50'
                                                : 'border-teal-200 bg-teal-50/30 hover:bg-teal-50/50'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={18} className={config.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className={`text-sm leading-snug ${notif.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                                                    {notif.title}
                                                </h3>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${config.bg} ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.message}</p>
                                            <p className="text-[11px] text-gray-400 mt-1.5">
                                                {new Date(notif.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Requirements Submission */}
                <div className="bg-white p-4 sm:p-5 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Requirements Submission Progress</h2>
                    <RequirementsSubmissionModule compact />
                </div>
            </main>
        </div>
    );
}

export default BeneficiaryDashboard;