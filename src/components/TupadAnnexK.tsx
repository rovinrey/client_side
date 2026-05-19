import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { programsAPI } from '../api/programs.api';
import { storageGet } from '../utils/storage';
import { ArrowLeft, FileText, UploadCloud } from 'lucide-react';

const TUPAD_PROGRAM_TYPE = 'tupad';

function TupadAnnexK() {
  const { programId: routeProgramId } = useParams<{ programId: string }>();
  const location = useLocation();
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [periodOfWork, setPeriodOfWork] = useState('');
  const [workDay, setWorkDay] = useState('Day 1');
  const [reportDate, setReportDate] = useState('');
  const [detailOfWork, setDetailOfWork] = useState('');
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [duringPhoto, setDuringPhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const data = await programsAPI.getActiveByType(TUPAD_PROGRAM_TYPE);
        setPrograms(data || []);

        if (data?.length) {
          const parsedRouteProgramId = routeProgramId ? Number(routeProgramId) : null;
          const matchedProgram = parsedRouteProgramId
            ? data.find((program: any) => program.program_id === parsedRouteProgramId)
            : null;

          if (matchedProgram) {
            setSelectedProgramId(matchedProgram.program_id);
          } else {
            setSelectedProgramId(data[0].program_id);
          }
        }
      } catch (error) {
        console.error('Failed to load TUPAD programs:', error);
        setErrorMessage('Unable to load TUPAD programs. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, [routeProgramId]);

  const getAuthHeaders = () => {
    const token = storageGet('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const uploadPhotos = async (createdReportId: number) => {
    const tokenHeaders = getAuthHeaders();
    const formData = new FormData();

    if (beforePhoto) formData.append('before_photo', beforePhoto);
    if (duringPhoto) formData.append('during_photo', duringPhoto);
    if (afterPhoto) formData.append('after_photo', afterPhoto);

    if (!beforePhoto && !duringPhoto && !afterPhoto) {
      return;
    }

    await axios.post(
      `${API_BASE_URL}/api/applications/tupad-reports/${createdReportId}/photos`,
      formData,
      {
        headers: {
          ...tokenHeaders,
        },
      }
    );
  };

  const handleCreateReport = async () => {
    setErrorMessage('');
    setStatusMessage('');

    if (!selectedProgramId) {
      setErrorMessage('Please select a TUPAD program.');
      return;
    }
    if (!reportDate.trim()) {
      setErrorMessage('Report date is required.');
      return;
    }
    if (!workDay.trim()) {
      setErrorMessage('Work day is required.');
      return;
    }
    if (!periodOfWork.trim() || !detailOfWork.trim()) {
      setErrorMessage('Period of work and detail of work are required.');
      return;
    }
    if (!beforePhoto || !duringPhoto || !afterPhoto) {
      setErrorMessage('Before, during, and after photos are required for every daily report.');
      return;
    }

    setSaving(true);

    try {
      const tokenHeaders = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/applications/tupad-reports`,
        {
          program_id: selectedProgramId,
          report_date: reportDate,
          work_day: workDay,
          period_of_work: periodOfWork.trim(),
          detail_of_work: detailOfWork,
        },
        { headers: tokenHeaders }
      );

      const createdReportId = response.data.report_id;
      setReportId(createdReportId);

      if (beforePhoto || duringPhoto || afterPhoto) {
        await uploadPhotos(createdReportId);
      }

      setStatusMessage('TUPAD accomplishment report saved successfully. You can now export Annex K.');
    } catch (error) {
      console.error('Create Annex K report error:', error);
      setErrorMessage('Unable to save the report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportAnnexK = async () => {
    setErrorMessage('');
    setStatusMessage('');
    setExporting(true);

    try {
      const params: Record<string, any> = {};
      if (reportId) {
        params.report_id = reportId;
      } else if (selectedProgramId) {
        params.program_id = selectedProgramId;
      }

      const tokenHeaders = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/applications/annex-k/export`, {
        headers: tokenHeaders,
        params,
        responseType: 'blob',
      });

      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Annex_K_TUPAD_Report_${new Date().toISOString().slice(0, 10)}.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Annex K document downloaded successfully.');
    } catch (error) {
      console.error('Export Annex K error:', error);
      setErrorMessage('Unable to export Annex K. Make sure you have the correct access rights.');
    } finally {
      setExporting(false);
    }
  };

  const backTo = location.pathname.includes('/staff') ? '/staff/programs' : '/programs';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to={backTo} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft size={18} /> Back to Programs
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex flex-col gap-3 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create TUPAD Annex K Report</h1>
          <p className="text-sm text-slate-500">
            Generate Annex K for the selected TUPAD program. This is now tied to a program instead of the general reports section.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-800">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800">
            {statusMessage}
          </div>
        )}

        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">TUPAD Program</label>
            <select
              value={selectedProgramId ?? ''}
              onChange={(e) => setSelectedProgramId(Number(e.target.value))}
              disabled={!!routeProgramId}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {programs.length === 0 ? (
                <option value="">No TUPAD programs found</option>
              ) : (
                programs.map((program) => (
                  <option key={program.program_id} value={program.program_id}>
                    {program.program_name}
                  </option>
                ))
              )}
            </select>
            {routeProgramId && (
              <p className="mt-2 text-xs text-slate-500">Annex K is being created for the selected program from the program list.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Detail of Work</label>
            <textarea
              rows={4}
              value={detailOfWork}
              onChange={(e) => setDetailOfWork(e.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-teal-500"
              placeholder="Describe the completed work."
            />
          </div>

          {/* Work Report Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Date / Period</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Before</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">During</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">After</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-6 py-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-2">Period of Work</label>
                        <textarea
                          rows={2}
                          value={periodOfWork}
                          onChange={(e) => setPeriodOfWork(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-teal-500"
                          placeholder="e.g. July 1, 2025 - July 15, 2025"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-2">Work Day</label>
                        <input
                          type="text"
                          value={workDay}
                          onChange={(e) => setWorkDay(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-teal-500"
                          placeholder="Day 1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-2">Report Date</label>
                        <input
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center gap-2">
                      {beforePhoto ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img src={URL.createObjectURL(beforePhoto)} alt="Before" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setBeforePhoto(null)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="relative cursor-pointer">
                          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors">
                            <UploadCloud size={24} className="text-emerald-600" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setBeforePhoto(e.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                        </label>
                      )}
                      <span className="text-xs text-slate-500 text-center font-medium">Before</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center gap-2">
                      {duringPhoto ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img src={URL.createObjectURL(duringPhoto)} alt="During" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setDuringPhoto(null)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="relative cursor-pointer">
                          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors">
                            <UploadCloud size={24} className="text-amber-600" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setDuringPhoto(e.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                        </label>
                      )}
                      <span className="text-xs text-slate-500 text-center font-medium">During</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center gap-2">
                      {afterPhoto ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img src={URL.createObjectURL(afterPhoto)} alt="After" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setAfterPhoto(null)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="relative cursor-pointer">
                          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 bg-sky-50 hover:bg-sky-100 flex items-center justify-center transition-colors">
                            <UploadCloud size={24} className="text-sky-600" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAfterPhoto(e.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                        </label>
                      )}
                      <span className="text-xs text-slate-500 text-center font-medium">After</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleCreateReport}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud size={18} />
              {saving ? 'Saving…' : 'Save Report'}
            </button>

            <button
              type="button"
              disabled={exporting || !reportId}
              onClick={handleExportAnnexK}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText size={18} />
              {exporting ? 'Exporting…' : 'Export Annex K'}
            </button>
          </div>

          {!reportId && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              Save the report first before exporting Annex K. All three photos are required for each daily report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TupadAnnexK;
