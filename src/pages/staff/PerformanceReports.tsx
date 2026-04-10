import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../../api/config';

const API_BASE = `${API_BASE_URL}/api`;


interface PerformanceData {
    period: string;
    beneficiaries_served: number;
    completion_rate: number;
    average_attendance: number;
    issues_resolved: number;
    feedback_score: number;
}

const PerformanceReports = () => {
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("monthly");

    useEffect(() => {
        fetchPerformanceData();
    }, [selectedPeriod]);

    const fetchPerformanceData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/staff/performance?period=${selectedPeriod}`);
            setPerformanceData(response.data);
        } catch (error) {
            console.error("Error fetching performance data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp size={28} /> Performance Reports
                    </h1>
                    <p className="text-gray-500 text-sm">View your staff performance metrics</p>
                </div>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <p className="text-gray-500">Loading performance data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {performanceData.map((data, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">{data.period}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                                    <p className="text-sm text-teal-700 font-medium">Beneficiaries Served</p>
                                    <p className="text-3xl font-bold text-teal-600 mt-2">{data.beneficiaries_served}</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <p className="text-sm text-green-700 font-medium">Completion Rate</p>
                                    <p className="text-3xl font-bold text-green-600 mt-2">{data.completion_rate}%</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${data.completion_rate}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                    <p className="text-sm text-purple-700 font-medium">Avg. Attendance</p>
                                    <p className="text-3xl font-bold text-purple-600 mt-2">{data.average_attendance}%</p>
                                </div>
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                    <p className="text-sm text-orange-700 font-medium">Issues Resolved</p>
                                    <p className="text-3xl font-bold text-orange-600 mt-2">{data.issues_resolved}</p>
                                </div>
                                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                                    <p className="text-sm text-indigo-700 font-medium">Feedback Score</p>
                                    <p className="text-3xl font-bold text-indigo-600 mt-2">{data.feedback_score}/5</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary Section */}
            <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 rounded-2xl p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Summary</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-600" size={20} />
                        <p className="text-gray-700">Great job maintaining consistent performance metrics across all periods</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-yellow-600" size={20} />
                        <p className="text-gray-700">Focus on improving completion rates in the coming quarter</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceReports;
