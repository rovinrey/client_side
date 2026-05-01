import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  UserPlus, 
  Search, 
  Loader, 
  AlertCircle, 
  RefreshCw,
} from 'lucide-react';

// --- Interfaces ---
interface Enrollee {
  enrollee_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  current_status: string;
  enrollment_date: string;
}

interface Application {
  application_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  status: string;
}

const API_BASE_URL = 'http://localhost:5000'; // Adjust to your server port

const BeneficiaryManagement = () => {
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('program_id');
  const programName = searchParams.get('program_name') || 'Program';

  // Map program name to program type for API filtering
  const getProgramType = (name: string): string => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('tupad')) return 'tupad';
    if (nameLower.includes('spes')) return 'spes';
    if (nameLower.includes('dilp')) return 'dilp';
    if (nameLower.includes('gip')) return 'gip';
    if (nameLower.includes('job') || nameLower.includes('seeker')) return 'job_seekers';
    return nameLower;
  };

  const programType = getProgramType(programName);

  // State
  const [enrollees, setEnrollees] = useState<Enrollee[]>([]);
  const [approvedApps, setApprovedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper for Auth Headers
  const getAuthHeaders = () => ({
Authorization: `Bearer ${sessionStorage.getItem('token')}`
  });

  // --- Data Fetching Logic ---

  const fetchData = async () => {
    if (!programId) {
      setError("No Program ID provided in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch current enrollees for this program
      const enrolleesRes = await axios.get(
        `${API_BASE_URL}/api/beneficiaries/program/${programId}/enrollees`,
        { headers: getAuthHeaders() }
      );

      // 2. Fetch approved applications FOR THIS PROGRAM TYPE only (to potentially enroll them)
      // Uses query parameter to filter by status=Approved AND programType
      const appsRes = await axios.get(
        `${API_BASE_URL}/api/applications?status=Approved&programType=${programType}`,
        { headers: getAuthHeaders() }
      );

      // Handle potential different response structures
      const enrolleesData = Array.isArray(enrolleesRes.data) ? enrolleesRes.data : enrolleesRes.data.enrollees || [];
      const appsData = Array.isArray(appsRes.data) ? appsRes.data : appsRes.data.applications || [];

      setEnrollees(enrolleesData);
      
      // Filter out those already enrolled
      const enrolledUserIds = new Set(enrolleesData.map((e: Enrollee) => e.user_id));
      const availableToEnroll = appsData.filter((app: Application) => !enrolledUserIds.has(app.user_id));
      
      setApprovedApps(availableToEnroll);

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.response?.data?.message || "Failed to load beneficiary data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [programId]);

  // --- Filter Logic ---
  const filteredEnrollees = enrollees.filter(e => 
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader className="animate-spin text-blue-600" size={40} />
        <p className="text-gray-500 font-medium">Loading beneficiaries for {programName}...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{programName} Management</h1>
          <p className="text-sm text-gray-500">Manage and monitor enrolled beneficiaries</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-blue-600 font-semibold">Total Enrolled</p>
            <Users className="text-blue-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-blue-900">{enrollees.length}</p>
        </div>
        
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-green-600 font-semibold">Ready to Enroll</p>
            <UserPlus className="text-green-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-900">{approvedApps.length}</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Beneficiary Name</th>
                <th className="px-6 py-4">Contact/Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Enrolled Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEnrollees.length > 0 ? (
                filteredEnrollees.map((person) => (
                  <tr key={person.enrollee_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {person.first_name} {person.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="text-sm">{person.email}</div>
                    </td>
<td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        person.current_status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : person.current_status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : person.current_status === 'Dropped'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {person.current_status}
                      </span>
                    </td>
<td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(person.enrollment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Users className="mx-auto mb-2 opacity-20" size={48} />
                    <p>No beneficiaries found for this program.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryManagement;
