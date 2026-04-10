import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout as clearAuth } from '../utils/auth';

function Topnav() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo Section */}
                    <div className="flex-shrink-0 flex items-center">
                        <span className="text-2xl font-bold text-teal-600">DOLE</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8 items-center">

                        
                       
                      
                        <button className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition">
                            Apply now
                        </button>
                        <button
                            onClick={() => {
                                clearAuth();
                                // no need for backend call here, ProtectedRoute will take care
                                // of redirecting once role is gone
                                navigate('/login');
                            }}
                            className="ml-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button 
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-600 hover:text-gray-900 focus:outline-none"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isOpen && (
                <div className="md:hidden bg-gray-50 border-t border-gray-200 px-2 pt-2 pb-3 space-y-1">
                    <a href="#" className="block px-3 py-2 text-gray-600 hover:bg-teal-50 hover:text-teal-600 rounded-md">Home</a>
                    <a href="#" className="block px-3 py-2 text-gray-600 hover:bg-teal-50 hover:text-teal-600 rounded-md">Solutions</a>
                    <a href="#" className="block px-3 py-2 text-gray-600 hover:bg-teal-50 hover:text-teal-600 rounded-md">Pricing</a>
                    <button
                        onClick={() => {
                            clearAuth();
                            navigate('/login');
                        }}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-bold"
                    >
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Topnav;