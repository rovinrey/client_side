import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../../api/config';

interface Beneficiary {
    id: number;
    first_name: string;
    last_name: string;
    program: string;
    status: 'Active' | 'Inactive' | 'Completed' | 'Dropped';
    contact_number: string;
    enrollment_date: string;
    progress: number;
}

const BeneficiaryManagement = () => {
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");

    useEffect(() => {
        fetchBeneficiaries();
    }, [selectedStatus]);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        try {
            const endpoint = selectedStatus === "All"
                ? `${API_BASE_URL}/api/beneficiaries`
                : `${API_BASE_URL}/api/beneficiaries?status=${selectedStatus}`;
            const response = await axios.get(endpoint);
            setBeneficiaries(response.data);
        } catch (error) {
            console.error("Error fetching beneficiaries:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBeneficiaries = beneficiaries.filter(b =>
        `${b.first_name} ${b.last_name}`.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Active':
                return <CheckCircle className="text-green-600" size={18} />;
            case 'Inactive':
                return <Clock className="text-yellow-600" size={18} />;
            case 'Completed':
                return <CheckCircle className="text-teal-600" size={18} />;
            case 'Dropped':
                return <XCircle className="text-red-600" size={18} />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
                return 'bg-green-100 text-green-700';
            case 'Inactive':
                return 'bg-yellow-100 text-yellow-700';
            case 'Completed':
                return 'bg-teal-100 text-teal-700';
            case 'Dropped':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Beneficiary Management</h1>
                    <p className="text-gray-500 text-sm">View and manage enrolled beneficiaries</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap items-center justify-between">
                <div className="flex-1 min-w-64">
                    <input
                        type="text"
                        placeholder="Search beneficiary name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Completed">Completed</option>
                    <option value="Dropped">Dropped</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <p className="text-gray-500">Loading beneficiaries...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredBeneficiaries.length > 0 ? (
                        filteredBeneficiaries.map(beneficiary => (
                            <div key={beneficiary.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {beneficiary.first_name} {beneficiary.last_name}
                                            </h3>
                                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(beneficiary.status)}`}>
                                                {getStatusIcon(beneficiary.status)}
                                                {beneficiary.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">{beneficiary.program}</p>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Contact</p>
                                                <p className="font-medium">{beneficiary.contact_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Enrollment Date</p>
                                                <p className="font-medium">{new Date(beneficiary.enrollment_date).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Progress</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${beneficiary.progress}%` }}></div>
                                                    </div>
                                                    <p className="font-medium">{beneficiary.progress}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">View Details</button>
                                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">Edit</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                            <p className="text-gray-500">No beneficiaries found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BeneficiaryManagement;
