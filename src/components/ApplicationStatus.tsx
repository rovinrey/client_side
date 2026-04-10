import { Clock } from 'lucide-react'

interface CheckStatusProps {
    view?: string;
}

function CheckStatus({ view }: CheckStatusProps) {
    return (
        <>
            <button
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${view === 'status' ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "bg-white text-gray-500 hover:bg-gray-100"}`}
            >
                <Clock size={18} />
                Check Status
            </button>
        </>
    )
};
export default CheckStatus;