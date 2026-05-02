    import { useState, useEffect, useCallback } from "react";
    import axios from "axios";
    import { API_BASE_URL } from "../../../api/config";
    import StatCard from "../../../components/Card";

    function Reports() {
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        
        const [selectedProgram, setSelectedProgram] = useState("all");
        const [timeRange, setTimeRange] = useState("year");
        const [availablePrograms, setAvailablePrograms] = useState<any[]>([]);
        const [barangayData, setBarangayData] = useState<any>(null);

        const [stats, setStats] = useState({
            total_beneficiaries: 0,
            active_programs: 0,
            total_distributed: 0,
            employment_rate: 0,
        });

        // Updated safeGet to accept headers as an argument to avoid dependency loops
        const safeGet = async (url: string, headers: any, params: Record<string, any> = {}) => {
            try {
                const res = await axios.get(url, { 
                    headers: headers,
                    params: { ...params, program: selectedProgram, range: timeRange }
                });
                return res?.data ?? null;
            } catch (err) {
                console.error(`API error: ${url}`, err);
                return null;
            }
        };

        const fetchAllData = useCallback(async () => {
            setLoading(true);
            setError(null);

            // 1. Get token and create headers INSIDE the callback
const token = localStorage.getItem("token");
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

            try {
                const [
                    beneficiaries,
                    programs,
                    accomplishment,
                    masterlist,
                    payroll,
                ] = await Promise.all([
                    safeGet(`${API_BASE_URL}/api/beneficiaries/count`, authHeaders),
                    safeGet(`${API_BASE_URL}/api/programs/allPrograms`, authHeaders),
                    safeGet(`${API_BASE_URL}/api/reports/program-accomplishment`, authHeaders),
                    safeGet(`${API_BASE_URL}/api/reports/beneficiary-master-list`, authHeaders),
                    safeGet(`${API_BASE_URL}/api/reports/payroll-summary`, authHeaders),
                ]);

                // Process barangay data from masterlist
                const rawBeneficiaries = masterlist?.beneficiaries || [];
                const groups: Record<string, any> = {};
                
                rawBeneficiaries.forEach((b: any) => {
                    const brgy = b.barangay || "Unspecified";
                    if (!groups[brgy]) groups[brgy] = { barangay: brgy, male: 0, female: 0, total: 0 };
                    groups[brgy].total++;
                    if (b.gender?.toLowerCase() === 'male') groups[brgy].male++;
                    if (b.gender?.toLowerCase() === 'female') groups[brgy].female++;
                });

                const barangays = Object.values(groups);
                const derivedBarangayData = {
                    barangays,
                    summary: {
                        total_male: barangays.reduce((sum: number, b: any) => sum + b.male, 0),
                        total_female: barangays.reduce((sum: number, b: any) => sum + b.female, 0),
                        grand_total: barangays.reduce((sum: number, b: any) => sum + b.total, 0),
                    }
                };

                setAvailablePrograms(Array.isArray(programs) ? programs : []);
                setBarangayData(derivedBarangayData);

                setStats({
                    total_beneficiaries: beneficiaries?.count ?? masterlist?.demographics?.total ?? 0,
                    active_programs: Array.isArray(programs) ? programs.length : (accomplishment?.totals?.program_count ?? 0),
                    total_distributed: payroll?.totals?.total_payout ?? 0,
                    employment_rate: accomplishment?.totals?.slot_rate ?? 0,
                });

            } catch (err) {
                console.error("Unexpected error:", err);
                setError("Failed to load reports data");
            } finally {
                setLoading(false);
            }
        // 2. authHeaders is no longer a dependency, stopping the loop
        }, [selectedProgram, timeRange]); 

        useEffect(() => {
            fetchAllData();
        }, [fetchAllData]);

        if (loading) return <div className="p-6 text-gray-500 font-medium">Loading reports and analytics...</div>;
        if (error) return <div className="p-6 text-red-500 bg-red-50 rounded-lg m-4">{error}</div>;

        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Reports and Data Analytics
                        </h1>
                        <p className="text-gray-500">System overview and program performance</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <select 
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 shadow-sm"
                        >
                            <option value="all">All Programs</option>
                            {availablePrograms.map((prog) => (
                                <option key={prog.program_id || prog.id} value={prog.program_id || prog.id}>
                                    {prog.program_name || prog.name}
                                </option>
                            ))}
                        </select>

                        <select 
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 shadow-sm"
                        >
                            <option value="today">Today</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="6months">Last 6 Months</option>
                            <option value="year">Last Year</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard
                        title="Total Beneficiaries"
                        value={stats.total_beneficiaries.toLocaleString()}
                        trend="↑"
                        trendLabel="Overall"
                    />
                    <StatCard
                        title="Active Programs"
                        value={stats.active_programs.toString()}
                        trend="Active"
                        trendLabel="Programs"
                    />
                    <StatCard
                        title="Total Distributed"
                        value={`₱${stats.total_distributed.toLocaleString()}`}
                        trend="Budget"
                        trendLabel="Utilized"
                    />
                    <StatCard
                        title="Employment Rate"
                        value={`${stats.employment_rate}%`}
                        trend="↑"
                        trendLabel="Placement"
                    />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                            Beneficiaries by Barangay
                        </h2>
                        <div className="text-sm text-slate-500">
                            Distribution across locations
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Barangay</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Program</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Male</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Female</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {barangayData?.barangays?.length > 0 ? (
                                    barangayData.barangays.map((barangay: any, index: number) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{barangay.barangay}</td>
                                            <td className="px-6 py-4 text-right text-sm text-teal-600 font-semibold">{barangay.male.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-sm text-pink-600 font-semibold">{barangay.female.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{barangay.total.toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                                            No barangay data available for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {barangayData?.summary && barangayData.barangays.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                                        <th className="px-6 py-3 text-left text-sm font-bold text-slate-900">TOTAL</th>
                                        <th className="px-6 py-3 text-right text-sm font-bold text-teal-700">{barangayData.summary.total_male.toLocaleString()}</th>
                                        <th className="px-6 py-3 text-right text-sm font-bold text-pink-700">{barangayData.summary.total_female.toLocaleString()}</th>
                                        <th className="px-6 py-3 text-right text-lg font-black text-slate-900">{barangayData.summary.grand_total.toLocaleString()}</th>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    export default Reports;