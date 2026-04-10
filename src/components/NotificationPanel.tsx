import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    CheckCheck,
    Megaphone,
    Clock,
    CheckCircle2,
    Rocket,
    Info,
    X,
} from 'lucide-react';
import {
    getNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    type Notification,
} from '../api/notifications.api';
import type { ProgramKey } from '../constants/beneficiaryPrograms';

const PROGRAM_NAME_TO_KEY: Record<string, ProgramKey> = {
    tupad: 'TUPAD',
    spes: 'SPES',
    dilp: 'DILP',
    gip: 'GIP',
    job_seekers: 'JOBSEEKERS',
};

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    program_available: { icon: Rocket, color: 'text-green-600', bg: 'bg-green-50' },
    program_ongoing: { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    program_coming_soon: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    program_completed: { icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-50' },
    general: { icon: Info, color: 'text-teal-600', bg: 'bg-teal-50' },
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationPanel() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [notifs, count] = await Promise.all([
                getNotifications(),
                getUnreadCount(),
            ]);
            setNotifications(notifs);
            setUnreadCount(count);
        } catch (error) {
            if ((error as any)?.response?.status !== 429) {
                console.error('Error fetching notifications:', error);
            }
        }
    }, []);

    // Initial fetch + poll every 60s
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!cancelled) await fetchData();
        };
        run();
        const interval = setInterval(run, 60000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [fetchData]);

    const handleOpen = async () => {
        setIsOpen(true);
        setLoading(true);
        await fetchData();
        setLoading(false);
    };

    const handleMarkRead = async (id: number) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.notification_id === id ? { ...n, is_read: 1 } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) handleMarkRead(notif.notification_id);

        if (notif.program_name) {
            const programKey = PROGRAM_NAME_TO_KEY[notif.program_name.toLowerCase()];
            if (programKey) {
                setIsOpen(false);
                navigate('/beneficiary/application', { state: { program: programKey } });
                return;
            }
        }
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <>
                    {/* Backdrop — dims on mobile, transparent on desktop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel — centered modal on mobile, anchored dropdown on desktop */}
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:translate-y-0 w-auto sm:w-[380px] max-h-[80vh] sm:max-h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                                    >
                                        <CheckCheck size={14} /> Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-6 space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="animate-pulse flex gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 w-3/4 bg-gray-100 rounded" />
                                                <div className="h-3 w-full bg-gray-50 rounded" />
                                                <div className="h-2 w-16 bg-gray-50 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <Bell className="text-gray-400" size={20} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        You'll be notified when new programs are available.
                                    </p>
                                </div>
                            ) : (
                                <ul>
                                    {notifications.map((notif) => {
                                        const config = typeConfig[notif.type] || typeConfig.general;
                                        const Icon = config.icon;
                                        return (
                                            <li
                                                key={notif.notification_id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`flex gap-3 px-5 py-3.5 border-b border-gray-50 cursor-pointer transition-colors ${
                                                    notif.is_read
                                                        ? 'bg-white hover:bg-gray-50'
                                                        : 'bg-teal-50/40 hover:bg-teal-50/60'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                    <Icon size={16} className={config.color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm leading-snug ${notif.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                                                            {notif.title}
                                                        </p>
                                                        {!notif.is_read && (
                                                            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 mt-1">
                                                        {timeAgo(notif.created_at)}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
