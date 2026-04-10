import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
    ListChecks,
  Clock,
  CreditCard,
  LogOut,
  X,
  Menu
} from 'lucide-react';
import { logout as clearAuth } from '../utils/auth';
import { API_BASE_URL } from '../api/config';

interface BeneficiarySidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function BeneficiarySidebar({ isOpen, setIsOpen }: BeneficiarySidebarProps) {
    // menus for beneficiary
    const menuItems = [
        { name: "Dashboard", path: "/beneficiary", icon: <LayoutDashboard size={18} />, exact: true },
        { name: "Application", path: "/beneficiary/application", icon: <FileText size={18} />, exact: true },
        { name: "Requirements", path: "/beneficiary/requirements", icon: <ListChecks size={18} />, exact: true },
        { name: "Attendance", path: "/beneficiary/attendance", icon: <Clock size={18} />, exact: true },
        { name: "Payment", path: "/beneficiary/payment", icon: <CreditCard size={18} />, exact: true },
    ];

    const navigate = useNavigate();

    const logout = async () => {
        // clear client-side storage
        clearAuth();

        // optionally hit backend for audit or cookie clearance
        try {
            await fetch(`${API_BASE_URL}/logout`, { method: 'POST' });
        } catch {
            // ignore network errors, user is logging out anyway
        }

        navigate('/login');
    }

    return (
        <aside className={`${
            isOpen
                ? 'fixed inset-y-0 left-0 w-[82vw] max-w-xs bg-white border-r border-gray-200 flex flex-col z-50 lg:relative lg:w-64 lg:min-h-screen lg:sticky lg:top-0 transition-all duration-300'
                : 'hidden lg:flex lg:flex-col lg:relative lg:w-16 lg:min-h-screen lg:bg-white lg:border-r lg:border-gray-200 lg:sticky lg:top-0 transition-all duration-300'
        }`}>
            {/* Logo Section */}
            <div className="p-5 lg:p-8 border-b border-green-200 relative">
                <h2 className={`text-2xl font-black tracking-tighter text-green-700 leading-tight ${!isOpen && 'text-center'}`}>
                    PESO {isOpen && <span className="text-gray-500 font-light text-sm block mt-1">Juban Portal</span>}
                </h2>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:bg-green-50 hover:text-green-700 transition-colors hidden lg:block"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 mt-4 lg:mt-6 px-3 lg:px-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.exact}
                        onClick={() => { if (window.innerWidth < 1024) setIsOpen(false); }}
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
                                <span className={`text-sm font-semibold tracking-wide ${!isOpen && 'hidden'}`}>
                                    {item.name}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 lg:p-4 border-t border-green-200">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                    <LogOut size={18} />
                    <span className={`${!isOpen && 'hidden'}`}>Log Out</span>
                </button>
            </div>
        </aside>
    );
}

export default BeneficiarySidebar;