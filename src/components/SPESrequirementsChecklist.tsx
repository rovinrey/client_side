import React, { useRef, useState } from "react";

interface Requirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
  file: File | null;
  checked: boolean;
}

const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    id: "spes_form2",
    label: "SPES Form 2",
    description: "Accomplished application form for the SPES program.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "spes_form2a",
    label: "SPES Form 2a",
    description: "Supplemental application form (family background and income details).",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "spes_form4",
    label: "SPES Form 4",
    description: "Employer endorsement and work deployment form.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "passport_picture",
    label: "Passport Size Picture",
    description: "Recent 1×1 or 2×2 passport-sized photograph with white background.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "birth_certificate",
    label: "Birth Certificate (Photocopy)",
    description: "PSA-issued or LCR-certified photocopy of your birth certificate.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "certificate_of_indigency",
    label: "Certificate of Indigency / Indecency",
    description:
      "Barangay-issued certificate of indigency (listed in your requirement set as certificate of indecency).",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "certificate_of_registration",
    label: "Certificate of Registration",
    description: "School-issued certificate confirming current enrollment for the semester.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "certificate_of_grades",
    label: "Certificate of Grades",
    description: "Official transcript of records or grade sheet from the previous semester.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "certificate_of_passing",
    label: "Certificate of Passing",
    description: "Document from the school certifying that the student passed the previous term.",
    required: true,
    file: null,
    checked: false,
  },
  {
    id: "philjobnet_screenshot",
    label: "PhilJobNet Registration Screenshot",
    description:
      "Screenshot showing successful registration on the PhilJobNet portal (www.philjobnet.gov.ph).",
    required: true,
    file: null,
    checked: false,
  },
];

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_FILE_SIZE_MB = 5;

interface SPESRequirementsChecklistProps {
  /** Called when all required documents are checked and each has a file attached.
   * Receives a map of requirement id → File. */
  onComplete?: (files: Record<string, File>) => void;
}

const SPESRequirementsChecklist: React.FC<SPESRequirementsChecklistProps> = ({
  onComplete,
}) => {
  const [requirements, setRequirements] =
    useState<Requirement[]>(INITIAL_REQUIREMENTS);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const totalRequired = requirements.filter((r) => r.required).length;
  const totalCompleted = requirements.filter((r) => r.checked && r.file).length;
  const progressPercent = Math.round((totalCompleted / totalRequired) * 100);
  const allDone = totalCompleted === totalRequired;

  const toggleCheck = (id: string) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );
  };

  const handleFileChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null;

    if (file) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFileErrors((prev) => ({
          ...prev,
          [id]: `File must be under ${MAX_FILE_SIZE_MB} MB.`,
        }));
        e.target.value = "";
        return;
      }
      setFileErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    setRequirements((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, file, checked: !!file || r.checked } : r
      )
    );
  };

  const removeFile = (id: string) => {
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = "";
    }
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, file: null } : r))
    );
    setFileErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSubmit = () => {
    if (!allDone || !onComplete) return;
    const files: Record<string, File> = {};
    requirements.forEach((r) => {
      if (r.file) files[r.id] = r.file;
    });
    onComplete(files);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          SPES Application Requirements
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Tick each item and attach the corresponding document. All{" "}
          <span className="font-semibold text-red-500">required</span> documents
          must be submitted before proceeding.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">
            Documents Completed
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {totalCompleted} / {totalRequired}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              allDone ? "bg-emerald-500" : "bg-teal-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-2 text-sm font-medium text-emerald-600">
            All requirements met — you are ready to submit!
          </p>
        )}
      </div>

      {/* Checklist */}
      <ul className="space-y-3">
        {requirements.map((req, index) => {
          const isComplete = req.checked && !!req.file;
          return (
            <li
              key={req.id}
              className={`rounded-xl border p-4 transition-colors ${
                isComplete
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Index badge */}
                <span
                  className={`mt-0.5 flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isComplete ? (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Label row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      htmlFor={`check-${req.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        id={`check-${req.id}`}
                        type="checkbox"
                        checked={req.checked}
                        onChange={() => toggleCheck(req.id)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-800">
                        {req.label}
                      </span>
                    </label>
                    {req.required && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200">
                        Required
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                    {req.description}
                  </p>

                  {/* File upload area */}
                  <div className="mt-3">
                    {req.file ? (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-emerald-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        <span className="flex-1 truncate text-xs font-medium text-gray-700">
                          {req.file.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {(req.file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(req.id)}
                          className="ml-1 rounded p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove file"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor={`file-${req.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      >
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Attach document (PDF, JPG, PNG — max {MAX_FILE_SIZE_MB} MB)
                        <input
                          ref={(el) => {
                            fileInputRefs.current[req.id] = el;
                          }}
                          id={`file-${req.id}`}
                          type="file"
                          accept={ACCEPTED_FILE_TYPES}
                          className="sr-only"
                          onChange={(e) => handleFileChange(req.id, e)}
                        />
                      </label>
                    )}
                    {fileErrors[req.id] && (
                      <p className="mt-1 text-xs text-red-500">
                        {fileErrors[req.id]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Submit / proceed button */}
      {onComplete && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={!allDone}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white tracking-wide transition-all hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {allDone ? (
              <>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Proceed to Application
              </>
            ) : (
              `Complete ${totalRequired - totalCompleted} remaining item${
                totalRequired - totalCompleted !== 1 ? "s" : ""
              }`
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SPESRequirementsChecklist;
