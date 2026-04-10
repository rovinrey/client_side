import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  ClipboardList, 
  BarChart3, 
  FileText,
  FileCheck,
  LogOut
} from 'lucide-react';
import { logout as clearAuth } from '../utils/auth';
import { API_BASE_URL } from '../api/config';

const API_BASE = API_BASE_URL;

function StaffSidebar() {

    const staffMenuItems = [
        { name: "Dashboard", path: "/staff", icon: <LayoutDashboard size={18} />, exact: true },
        { name: "Programs", path: "/staff/programs", icon: <ClipboardList size={18} /> },
        { name: "Applications", path: "/staff/applications", icon: <FileCheck size={18} /> },
        { name: "Documents", path: "/staff/documents-review", icon: <FileText size={18} /> },
        { name: "Payment", path: "/staff/payment", icon: <CreditCard size={18} /> },
        { name: "Reports", path: "/staff/reports", icon: <BarChart3 size={18} /> },
    ];

    const navigate = useNavigate();

    const logout = async () => {
        clearAuth();
        try {
            await fetch(`${API_BASE}/logout`, { method: 'POST' });
        } catch {
            // ignore
        }
        navigate('/login');
    };

    return (
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0">
            {/* Logo Section */}
            <div className="p-8 border-b border-green-200">
                <h2 className="text-2xl font-black tracking-tighter text-green-700 leading-tight">
                    PESO <span className="text-gray-500 font-light text-sm block mt-1">Juban Staff</span>
                </h2>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 mt-6 px-4 space-y-1">
                {staffMenuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `
                            flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                            ${isActive 
                                ? "bg-green-600 text-white shadow-lg shadow-green-200" 
                                : "text-gray-600 hover:bg-green-50 hover:text-green-700"}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`${isActive ? "text-white" : "text-gray-400 group-hover:text-green-500"}`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm font-semibold tracking-wide">
                                    {item.name}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-green-200">
                <button 
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                    <LogOut size={18} />
                    Log Out
                </button>
            </div>
        </aside>
    );
}

export default StaffSidebar;
