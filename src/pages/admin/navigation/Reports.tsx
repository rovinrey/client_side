import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FileSpreadsheet } from "lucide-react";
import { API_BASE_URL } from "../../../api/config";
import { storageGet } from "../../../utils/storage";

const ANNEX_EXCEL_EXPORTS = [
    {
        key: "d",
        label: "Annex D",
        description: "TUPAD beneficiaries",
        path: "/api/applications/annex-d/export",
        downloadPrefix: "Annex_D_TUPAD",
        fileType: "xlsx",
    },
    {
        key: "b",
        label: "Annex B",
        description: "TUPAD work program",
        path: "/api/applications/annex-b/export",
        downloadPrefix: "Annex_B_TUPAD",
        fileType: "xlsx",
    },
    {
        key: "h",
        label: "Annex H",
        description: "TUPAD program appraisal",
        path: "/api/applications/annex-h/export",
        downloadPrefix: "Annex_H_TUPAD",
        fileType: "xlsx",
    },
    {
        key: "l",
        label: "Annex L",
        description: "TUPAD Payroll",
        path: "/api/applications/annex-l/export",
        downloadPrefix: "Annex_L_TUPAD",
        fileType: "xlsx",
    },
    // Annex K export is handled from the selected TUPAD program page instead of the reports dashboard
] as const;

function Reports() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [annexExportKey, setAnnexExportKey] = useState<string | null>(null);
    
    // Use program_type values directly (e.g., "tupad", "spes", "dilp", "all")
    const [selectedProgram] = useState("all");
    const [timeRange, setTimeRange] = useState("year");
    const [sortOrder, setSortOrder] = useState("asc");
    const [selectedBarangay] = useState("all");
    const [barangayData, setBarangayData] = useState<any>(null);


// Safe API call using the new summary endpoint
    const safeGet = async (url: string, headers: any, params: Record<string, any> = {}) => {
        try {
            const res = await axios.get(url, { 
                headers: headers,
                params: params
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

        // Get token and create headers INSIDE the callback
        const token = storageGet("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            // Call the new /api/reports/summary endpoint with correct query params
            const summaryData = await safeGet(`${API_BASE_URL}/api/reports/summary`, authHeaders, {
                program: selectedProgram,
                sort: sortOrder,
                timeRange: timeRange
            });

         

            // Set barangay data from summary response
            const derivedBarangayData = {
                barangays: summaryData?.barangays || [],
                summary: summaryData?.summary || {
                    total_male: 0,
                    total_female: 0,
                    grand_total: 0,
                }
            };

            setBarangayData(derivedBarangayData);

        } catch (err) {
            console.error("Unexpected error:", err);
            setError("Failed to load reports data");
        } finally {
            setLoading(false);
        }
    }, [selectedProgram, timeRange, sortOrder]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleAnnexExportDownload = async (item: (typeof ANNEX_EXCEL_EXPORTS)[number]) => {
        const token = storageGet("token");
        if (!token) {
            alert("Please sign in as admin to download annex files.");
            return;
        }
        setAnnexExportKey(item.key);
        try {
            const res = await axios.get(`${API_BASE_URL}${item.path}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${item.downloadPrefix}_${new Date().toISOString().slice(0, 10)}.${item.fileType || 'xlsx'}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Download failed. Admin access is required for PESO annex exports.");
        } finally {
            setAnnexExportKey(null);
        }
    };

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
                    {/* Sort Order Filter */}
                    <select 
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 shadow-sm"
                    >
                        <option value="asc">A-Z Sort</option>
                        <option value="desc">Z-A Sort</option>
                    </select>


                    {/* Time Range Filter */}
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

            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 mb-10">
                <div className="flex flex-wrap gap-3">
                    {ANNEX_EXCEL_EXPORTS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => handleAnnexExportDownload(item)}
                            disabled={annexExportKey !== null}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                            <FileSpreadsheet size={18} className="shrink-0" />
                            <span>
                                {annexExportKey === item.key ? "Exporting…" : item.label}
                                <span className="block text-xs font-normal text-emerald-800/80">{item.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                        Beneficiaries by Barangay
                    </h2>
                    <div className="text-sm text-slate-500">
                        {selectedBarangay === "all" ? "All Locations" : `Showing: ${selectedBarangay}`}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Barangay</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Program Type</th>
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
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {barangay.program_type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-teal-600 font-semibold">{(barangay.male || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-sm text-pink-600 font-semibold">{(barangay.female || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{(barangay.total || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                                        No barangay data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {barangayData?.summary && barangayData.barangays.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <th className="px-6 py-3 text-left text-sm font-bold text-slate-900">TOTAL</th>
                                    <th className="px-6 py-3 text-left text-sm font-bold text-slate-900">-</th>
                                    <th className="px-6 py-3 text-right text-sm font-bold text-teal-700">{(barangayData.summary.total_male || 0).toLocaleString()}</th>
                                    <th className="px-6 py-3 text-right text-sm font-bold text-pink-700">{(barangayData.summary.total_female || 0).toLocaleString()}</th>
                                    <th className="px-6 py-3 text-right text-lg font-black text-slate-900">{(barangayData.summary.grand_total || 0).toLocaleString()}</th>
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
