import React, { useState, useEffect } from "react";
import { X, Loader, AlertCircle } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from '../api/config';

interface Program {
    program_id: number;
    program_name: string;
    location: string;
    slots: number;
    filled: number;
    status: string;
    start_date: string | null;
    end_date: string | null;
}

interface EnrollmentModalProps {
    isOpen: boolean;
    applicationId: number;
    beneficiaryName: string;
    programType: string;
    onClose: () => void;
    onEnroll: (programId: number) => void;
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
    isOpen,
    applicationId,
    beneficiaryName,
    programType,
    onClose,
    onEnroll,
}) => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    useEffect(() => {
        if (isOpen) {
            fetchPrograms();
        }
    }, [isOpen]);

    const fetchPrograms = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/programs/allPrograms`, { headers });
            const filteredPrograms = response.data.filter((prog: Program) =>
                prog.program_name.toLowerCase().includes(programType.toLowerCase())
            );
            setPrograms(filteredPrograms);
            if (filteredPrograms.length > 0) {
                setSelectedProgram(filteredPrograms[0].program_id);
            }
        } catch (err) {
            console.error("Error fetching programs:", err);
            setError("Failed to load programs");
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedProgram) {
            setError("Please select a program");
            return;
        }

        setEnrolling(true);
        setError(null);
        try {
            await axios.post(
                `${API_BASE_URL}/api/beneficiaries/enroll`,
                {
                    applicationId,
                    programId: selectedProgram,
                },
                { headers }
            );
            
            onEnroll(selectedProgram);
            onClose();
        } catch (err: any) {
            console.error("Error enrolling beneficiary:", err);
            setError(err.response?.data?.message || "Failed to enroll beneficiary");
        } finally {
            setEnrolling(false);
        }
    };

    if (!isOpen) return null;

    const selectedProgramData = programs.find(p => p.program_id === selectedProgram);

return (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-95 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Enroll Beneficiary</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Beneficiary Info */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Beneficiary
                        </label>
                        <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                            {beneficiaryName}
                        </div>
                    </div>

                    {/* Program Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Program Type
                        </label>
                        <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                            {programType.toUpperCase()}
                        </div>
                    </div>

                    {/* Program Selection */}
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader className="animate-spin text-teal-600" size={24} />
                        </div>
                    ) : programs.length > 0 ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Program Instance
                            </label>
                            <select
                                value={selectedProgram || ""}
                                onChange={(e) => setSelectedProgram(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-teal-500"
                            >
                                <option value="">-- Select Program --</option>
                                {programs.map((prog) => (
                                    <option key={prog.program_id} value={prog.program_id}>
                                        {prog.program_name} - {prog.location} (Slots: {prog.filled}/{prog.slots})
                                    </option>
                                ))}
                            </select>

                            {/* Selected Program Details */}
                            {selectedProgramData && (
                                <div className="mt-3 text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700">
                                    <div className="font-medium mb-1">Program Details:</div>
                                    <div>Location: {selectedProgramData.location}</div>
                                    <div>Availability: {selectedProgramData.filled}/{selectedProgramData.slots} slots filled</div>
                                    {selectedProgramData.start_date && (
                                        <div>Start Date: {new Date(selectedProgramData.start_date).toLocaleDateString()}</div>
                                    )}
                                    {selectedProgramData.status && (
                                        <div>Status: <span className="capitalize">{selectedProgramData.status}</span></div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            No programs available for enrollment
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        disabled={enrolling}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleEnroll}
                        disabled={enrolling || programs.length === 0}
                        className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {enrolling ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Enrolling...
                            </>
                        ) : (
                            "Enroll"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnrollmentModal;
