import React from 'react';
import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import type { ApplicationSubmission } from '../api/applicationStatus.api';

interface ApplicationStatusPanelProps {
  submissions: ApplicationSubmission[];
}


const getStatusStyles = (status: string | null) => {
  if (status === 'Approved') {
    return {
      badge: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="h-4 w-4" />,
      ring: 'ring-emerald-200'
    };
  }

  if (status === 'Rejected') {
    return {
      badge: 'bg-rose-100 text-rose-700',
      icon: <XCircle className="h-4 w-4" />,
      ring: 'ring-rose-200'
    };
  }

  if (status === 'Pending') {
    return {
      badge: 'bg-amber-100 text-amber-700',
      icon: <Clock3 className="h-4 w-4" />,
      ring: 'ring-amber-200'
    };
  }

  return {
    badge: 'bg-slate-100 text-slate-700',
    icon: <FileText className="h-4 w-4" />,
    ring: 'ring-slate-200'
  };
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const ApplicationStatusPanel: React.FC<ApplicationStatusPanelProps> = ({  submissions }) => {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl p-4 sm:p-6 bg-[linear-gradient(135deg,#eff6ff,#f8fafc)] border border-teal-100">
        <h2 className="text-xl font-black text-slate-900">Your Application Status</h2>

      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">

        {submissions.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            No submitted forms yet. Start a new application to see updates here.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {submissions.slice(0, 8).map((item) => {
              const style = getStatusStyles(item.status);
              return (
                <article
                  key={item.application_id}
                  className="rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.program_name || item.program_type} Application
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted on {formatDate(item.applied_at)}
                    </p>
                    {item.status === 'Rejected' && item.rejection_reason && (
                      <p className="text-xs text-rose-700 mt-2">Reason: {item.rejection_reason}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${style.badge}`}>
                    {style.icon}
                    {item.status}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ApplicationStatusPanel;
