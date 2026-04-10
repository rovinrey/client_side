import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../../api/config';

const API_BASE = `${API_BASE_URL}/api`;


interface Issue {
    id: number;
    beneficiary_id: number;
    beneficiary_name: string;
    issue_type: 'Documentation' | 'Attendance' | 'Compliance' | 'Other';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    status: 'Open' | 'In Progress' | 'Resolved';
    description: string;
    reported_date: string;
    assigned_to: string;
}

const IssueTracking = () => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPriority, setSelectedPriority] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("Open");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        beneficiary_id: "",
        issue_type: "Other",
        priority: "Medium",
        description: ""
    });

    useEffect(() => {
        fetchIssues();
    }, [selectedStatus]);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/issues`);
            setIssues(response.data);
        } catch (error) {
            console.error("Error fetching issues:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/issues`, formData);
            setFormData({
                beneficiary_id: "",
                issue_type: "Other",
                priority: "Medium",
                description: ""
            });
            setShowModal(false);
            fetchIssues();
            alert("Issue reported successfully!");
        } catch (error) {
            console.error("Error reporting issue:", error);
            alert("Failed to report issue");
        }
    };

    const filteredIssues = issues.filter(issue =>
        (selectedStatus === "All" || issue.status === selectedStatus) &&
        (selectedPriority === "All" || issue.priority === selectedPriority)
    );

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical':
                return 'bg-red-100 text-red-700 border-red-300';
            case 'High':
                return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'Medium':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'Low':
                return 'bg-green-100 text-green-700 border-green-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Open':
                return <AlertCircle className="text-red-600" size={18} />;
            case 'In Progress':
                return <Clock className="text-yellow-600" size={18} />;
            case 'Resolved':
                return <CheckCircle className="text-green-600" size={18} />;
            default:
                return null;
        }
    };

    const stats = {
        open: issues.filter(i => i.status === 'Open').length,
        inProgress: issues.filter(i => i.status === 'In Progress').length,
        critical: issues.filter(i => i.priority === 'Critical').length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertCircle size={28} /> Issue Tracking
                    </h1>
                    <p className="text-gray-500 text-sm">Report and track beneficiary issues</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-teal-100"
                >
                    <AlertCircle size={18} />
                    Report Issue
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700">Open Issues</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{stats.open}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-yellow-700">In Progress</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.inProgress}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-orange-700">Critical Priority</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.critical}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option value="All">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                </select>
                <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option value="All">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
            </div>

            {/* Issues Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <p className="text-gray-500">Loading issues...</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Issue ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Beneficiary</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Priority</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date Reported</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Assigned To</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIssues.map(issue => (
                                    <tr key={issue.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-mono text-gray-600">#{issue.id}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{issue.beneficiary_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{issue.issue_type}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(issue.priority)}`}>
                                                {issue.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(issue.status)}
                                                <span className="font-medium">{issue.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(issue.reported_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{issue.assigned_to}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-6">Report Issue</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary ID</label>
                                <input
                                    type="text"
                                    value={formData.beneficiary_id}
                                    onChange={(e) => setFormData({...formData, beneficiary_id: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
                                <select
                                    value={formData.issue_type}
                                    onChange={(e) => setFormData({...formData, issue_type: e.target.value as any})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="Documentation">Documentation</option>
                                    <option value="Attendance">Attendance</option>
                                    <option value="Compliance">Compliance</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssueTracking;
