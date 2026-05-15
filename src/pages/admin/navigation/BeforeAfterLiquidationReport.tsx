import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FileDown, Camera, MapPin, Clock3 } from 'lucide-react';
import { API_BASE_URL } from '../../../api/config';
import { storageGet } from '../../../utils/storage';

type PhotoDoc = { url: string; caption: string };

type BeforeAfterPayload = {
  program_type: string;
  program_name: string;
  location: string;
  gps: string;
  before: {
    date: string;
    description: string;
  };
  during: {
    date: string;
    description: string;
  };
  after: {
    date: string;
    description: string;
  };
  before_photos: PhotoDoc[];
  during_photos: PhotoDoc[];
  after_photos: PhotoDoc[];
};

const BeforeAfterLiquidationReport = () => {
  const [searchParams] = useSearchParams();
  const programType = searchParams.get('program') || 'tupad';
  const programName = searchParams.get('name') || 'TUPAD - Emergency Employment';

  const token = storageGet('token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const [form] = useState(() => {
    const payload: BeforeAfterPayload = {
      program_type: programType,
      program_name: programName,
      location: 'Juban, Sorsogon',
      gps: 'GPS: 13.6218° N, 123.1852° E',
      before: {
        date: 'May 1, 2026',
        description: 'Blocked drainage canal with heavy siltation and plastic waste.',
      },
      during: {
        date: 'May 7, 2026',
        description: 'Beneficiaries de-clogging and removing silt manually.',
      },
      after: {
        date: 'May 14, 2026',
        description: '100% cleared canal; water flowing freely to the main outlet.',
      },
      before_photos: [{ url: '[Before Image Placeholder]', caption: 'Before - drainage canal condition' }],
      during_photos: [{ url: '[During Image Placeholder]', caption: 'During - beneficiaries de-clogging' }],
      after_photos: [{ url: '[After Image Placeholder]', caption: 'After - fully cleared canal' }],
    };
    return payload;
  });

  const payloadJson = useMemo(() => JSON.stringify(form, null, 2), [form]);

  const doExport = async (kind: 'word' | 'excel') => {
    const endpoint =
      kind === 'word'
        ? `${API_BASE_URL}/api/reports/export/before-after/liquidation-accomplishment-word`
        : `${API_BASE_URL}/api/reports/export/before-after/liquidation-accomplishment-excel`;

    const res = await axios.post(
      endpoint,
      {
        program_type: form.program_type,
        program_name: form.program_name,
        location: form.location,
        gps: form.gps,
        before: { date: form.before.date, description: form.before.description },
        during: { date: form.during.date, description: form.during.description },
        after: { date: form.after.date, description: form.after.description },
        before_photos: form.before_photos,
        during_photos: form.during_photos,
        after_photos: form.after_photos,
      },
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
      }
    );

    const contentType = res.headers['content-type'] || '';
    const ext = kind === 'word' ? 'docx' : 'xlsx';
    const defaultFile = `BeforeAfter_Liquidation_Accomplishment_${new Date().toISOString().slice(0, 10)}.${ext}`;

    const disposition = res.headers['content-disposition'];
    const filenameFromHeader = disposition?.match(/filename="?([^\"]+)"?/i)?.[1];

    const fileName = filenameFromHeader || defaultFile;

    const blob = new Blob([res.data], { type: contentType || undefined });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Before / During / After — Liquidation Accomplishment</h1>
        <p className="text-gray-500 text-sm">Exports include narrative + photo documentation for <span className="font-semibold text-gray-900">{programName}</span>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
            <MapPin size={16} /> Location
          </div>
          <div className="text-sm text-gray-800 mt-2">{form.location}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
            <Clock3 size={16} /> Dates
          </div>
          <div className="text-sm text-gray-800 mt-2">
            Before: {form.before.date}
            <br />During: {form.during.date}
            <br />After: {form.after.date}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
            <Camera size={16} /> GPS
          </div>
          <div className="text-sm text-gray-800 mt-2">{form.gps}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 mb-3">Export Payload (JSON)</h2>
        <pre className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs overflow-auto max-h-64">{payloadJson}</pre>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => doExport('word')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-semibold text-sm"
        >
          <FileDown size={16} /> Export Word (.docx)
        </button>

        <button
          type="button"
          onClick={() => doExport('excel')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-sm"
        >
          <FileDown size={16} /> Export Excel (.xlsx)
        </button>
      </div>
    </div>
  );
};

export default BeforeAfterLiquidationReport;

