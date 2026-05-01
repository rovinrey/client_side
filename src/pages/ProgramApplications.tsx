import { useState } from 'react';
import { ChevronRight, Briefcase, GraduationCap, TrendingUp } from 'lucide-react';
import SPESApplicationForm from './beneficiary/forms/SPES/SPESApplicationForm';
import GIPApplicationForm from '../components/GIPApplicationForm';
import DILPApplicationForm from '../components/DILPApplicationForm';

type ActiveForm = 'spes' | 'gip' | 'dilp' | null;

const ProgramApplications = () => {
    const [activeForm, setActiveForm] = useState<ActiveForm>(null);

    const programs = [
        {
            id: 'spes',
            name: 'SPES',
            fullName: 'Self-Employment Assistance (SPES)',
            description: 'Support program for individuals aspiring to be self-employed and entrepreneurs',
            icon: TrendingUp,
            color: 'bg-teal-50 border-teal-200',
            accentColor: 'text-teal-600',
            bgColor: 'bg-teal-600',
            documents: 4,
        },
        {
            id: 'gip',
            name: 'GIP',
            fullName: 'Graduates Internship Program (GIP)',
            description: 'Internship program designed for fresh graduates to gain practical work experience',
            icon: GraduationCap,
            color: 'bg-blue-50 border-blue-200',
            accentColor: 'text-blue-600',
            bgColor: 'bg-blue-600',
            documents: 5,
        },
        {
            id: 'dilp',
            name: 'DILP',
            fullName: 'Development and Improvement of Labor Program (DILP)',
            description: 'Training and development program for micro and small business entrepreneurs',
            icon: Briefcase,
            color: 'bg-purple-50 border-purple-200',
            accentColor: 'text-purple-600',
            bgColor: 'bg-purple-600',
            documents: 4,
        },
    ];

    if (activeForm === 'spes') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-4 px-4">
                <button
                    onClick={() => setActiveForm(null)}
                    className="mb-6 flex items-center gap-2 text-teal-600 hover:text-teal-800 font-medium transition-colors"
                >
                    ← Back to Programs
                </button>
                <SPESApplicationForm onSuccess={() => setActiveForm(null)} />
            </div>
        );
    }

    if (activeForm === 'gip') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-4 px-4">
                <button
                    onClick={() => setActiveForm(null)}
                    className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                    ← Back to Programs
                </button>
                <GIPApplicationForm onSuccess={() => setActiveForm(null)} />
            </div>
        );
    }

    if (activeForm === 'dilp') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-4 px-4">
                <button
                    onClick={() => setActiveForm(null)}
                    className="mb-6 flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                    ← Back to Programs
                </button>
                <DILPApplicationForm onSuccess={() => setActiveForm(null)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Government Programs</h1>
                    <p className="text-lg text-gray-600">
                        Choose a program to apply for employment assistance and training opportunities
                    </p>
                </div>

                {/* Programs Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {programs.map(program => {
                        const IconComponent = program.icon;
                        return (
                            <div
                                key={program.id}
                                className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer ${program.color}`}
                                onClick={() => setActiveForm(program.id as ActiveForm)}
                            >
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-lg ${program.bgColor} text-white flex items-center justify-center mb-4`}>
                                    <IconComponent size={32} />
                                </div>

                                {/* Title */}
                                <h2 className={`text-2xl font-bold mb-2 ${program.accentColor}`}>
                                    {program.name}
                                </h2>

                                {/* Full Name */}
                                <p className="text-sm font-semibold text-gray-600 mb-3">
                                    {program.fullName}
                                </p>

                                {/* Description */}
                                <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                                    {program.description}
                                </p>

                                {/* Documents Required */}
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${program.bgColor} text-white`}>
                                    {program.documents} Required Documents
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={() => setActiveForm(program.id as ActiveForm)}
                                    className={`w-full ${program.bgColor} text-white py-3 rounded-lg font-bold hover:shadow-md transition-all flex items-center justify-center gap-2`}
                                >
                                    Apply Now
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Information Box */}
                <div className="mt-12 bg-white rounded-xl shadow-sm p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Application Information</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Required Documents</h4>
                            <p className="text-gray-600 text-sm">
                                Each program requires different documents. You'll be prompted to upload all required documents before submitting your application.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Processing Time</h4>
                            <p className="text-gray-600 text-sm">
                                Applications are typically reviewed within 5-7 business days. You'll receive updates via email and SMS.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Questions?</h4>
                            <p className="text-gray-600 text-sm">
                                Contact our support team at support@deped.gov.ph or call our hotline for assistance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-8 bg-white rounded-xl shadow-sm p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">✨ Application Features</h3>
                    <ul className="grid md:grid-cols-2 gap-4 text-gray-700">
                        <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold mt-1">✓</span>
                            <span>Secure online form with automatic data validation</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold mt-1">✓</span>
                            <span>Easy document upload with file type verification</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold mt-1">✓</span>
                            <span>Real-time application status tracking</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold mt-1">✓</span>
                            <span>Email and SMS notifications for updates</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold mt-1">✓</span>
                            <span>24/7 online access to your applications</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-600 font-bold mt-1">✓</span>
                            <span>Secure data encryption and privacy protection</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ProgramApplications;
