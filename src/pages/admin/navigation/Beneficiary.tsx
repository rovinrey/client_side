import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { storageGet } from '../../../utils/storage';
import { API_BASE_URL } from '../../../api/config';
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

type ProgramType = 'tupad' | 'spes' | 'dilp' | 'gip' | 'job_seekers' | string;

interface EmploymentHistoryEntry {
  application_id: number;
  program_type: ProgramType;
  application_status: string;
  applied_at: string;
  employment_status: string | null;
  tupad: { occupation: string | null; monthly_income: number | string | null } | null;
  gip: {
    employment_status: string | null;
    school: string | null;
    course: string | null;
    year_graduated: string | null;
    education_level: string | null;
    skills: string | null;
  } | null;
  job_seekers: {
    employment_status: string | null;
    preferred_work_type: string | null;
    preferred_industry: string | null;
    years_of_experience: string | null;
    technical_skills: string | null;
    expected_salary: string | null;
    availability: string | null;
  } | null;
}

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

  // Employment history modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Enrollee | null>(null);
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistoryEntry[]>([]);
  const [employmentLoading, setEmploymentLoading] = useState(false);
  const [employmentError, setEmploymentError] = useState<string | null>(null);

  // Helper for Auth Headers
  const getAuthHeaders = () => {
    const token = storageGet('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // --- Data Fetching Logic ---

  const fetchData = useCallback(async () => {
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

    } catch (err: unknown) {
      console.error("Fetch Error:", err);
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as any)?.message || "Failed to load beneficiary data.");
      } else {
        setError("Failed to load beneficiary data.");
      }
    } finally {
      setLoading(false);
    }
  }, [programId, programType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchEmploymentHistory = async (userId: number) => {
    setEmploymentLoading(true);
    setEmploymentError(null);
    try {
      const res = await axios.get<{ history: EmploymentHistoryEntry[] }>(
        `${API_BASE_URL}/api/beneficiaries/admin/user/${userId}/employment-history`,
        { headers: getAuthHeaders() }
      );
      setEmploymentHistory(Array.isArray(res.data?.history) ? res.data.history : []);
    } catch (err: unknown) {
      console.error('Employment history fetch error:', err);
      if (axios.isAxiosError(err)) {
        setEmploymentError((err.response?.data as any)?.message || 'Failed to load employment history.');
      } else {
        setEmploymentError('Failed to load employment history.');
      }
      setEmploymentHistory([]);
    } finally {
      setEmploymentLoading(false);
    }
  };

  const openDetails = async (person: Enrollee) => {
    setSelectedBeneficiary(person);
    setDetailsOpen(true);
    await fetchEmploymentHistory(person.user_id);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedBeneficiary(null);
    setEmploymentHistory([]);
    setEmploymentError(null);
    setEmploymentLoading(false);
  };

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
                      <button
                        type="button"
                        onClick={() => openDetails(person)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
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

      {/* Employment history modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDetails}
          />

          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-base font-bold text-gray-900">Beneficiary Details</h2>
                <p className="text-sm text-gray-500">
                  {selectedBeneficiary ? `${selectedBeneficiary.first_name} ${selectedBeneficiary.last_name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Employment History</h3>

                {employmentLoading ? (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Loader className="animate-spin" size={18} />
                    Loading employment history…
                  </div>
                ) : employmentError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold">Failed to load</div>
                      <div>{employmentError}</div>
                      {selectedBeneficiary && (
                        <button
                          type="button"
                          onClick={() => fetchEmploymentHistory(selectedBeneficiary.user_id)}
                          className="mt-2 inline-flex items-center gap-2 text-red-700 font-semibold underline hover:text-red-900"
                        >
                          <RefreshCw size={16} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ) : employmentHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">No employment-related submissions found for this beneficiary.</p>
                ) : (
                  <ul className="space-y-3">
                    {employmentHistory.map((h) => (
                      <li key={h.application_id} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-900">
                            {String(h.program_type).toUpperCase().replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Applied: {h.applied_at ? new Date(h.applied_at).toLocaleString() : '—'}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Application Status</div>
                            <div className="text-gray-800">{h.application_status || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employment Status</div>
                            <div className="text-gray-800">{h.employment_status || '—'}</div>
                          </div>

                          {h.tupad && (
                            <>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Occupation</div>
                                <div className="text-gray-800">{h.tupad.occupation || '—'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Income</div>
                                <div className="text-gray-800">{h.tupad.monthly_income ?? '—'}</div>
                              </div>
                            </>
                          )}

                          {h.job_seekers && (
                            <>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Years of Experience</div>
                                <div className="text-gray-800">{h.job_seekers.years_of_experience || '—'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preferred Industry</div>
                                <div className="text-gray-800">{h.job_seekers.preferred_industry || '—'}</div>
                              </div>
                            </>
                          )}

                          {h.gip && (
                            <>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education</div>
                                <div className="text-gray-800">
                                  {[h.gip.education_level, h.gip.course, h.gip.school].filter(Boolean).join(' • ') || '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Skills</div>
                                <div className="text-gray-800">{h.gip.skills || '—'}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiaryManagement;
