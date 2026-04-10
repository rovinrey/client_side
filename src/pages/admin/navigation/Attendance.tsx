import AttendanceMonitoringTable from '../../../components/AttendanceMonitoringTable';

function AttendancePage() {
    return (
        <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Monitoring</h1>
                    <p className="text-sm text-gray-500">
                        Review beneficiary attendance records across all active programs from a dedicated admin view.
                    </p>
                </div>
            </div>

            <AttendanceMonitoringTable />
        </section>
    );
}

export default AttendancePage;