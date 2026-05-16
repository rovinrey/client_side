import React from "react";

// Updated types to include 'district' from Annex D
export type PersonalInformationFieldErrorMap = Partial<Record<string, string>>;
export type PersonalInformationMode = "edit" | "readOnly";
export type PersonalInformationValues = Record<string, string | null | undefined>;

export type PersonalInformationFieldMap = {
    firstName: string;
    middleName: string;
    lastName: string;
    extensionName?: string;
    birthDate: string;
    gender: string;
    civilStatus: string;
    contactNumber: string;
    streetZone: string;
    barangay: string;
    city: string;
    province: string;
    district: string; // Added from Annex D
    zipCode?: string;
};

export interface PersonalInformationProps {
    mode?: PersonalInformationMode;
    values: PersonalInformationValues;
    fieldMap: PersonalInformationFieldMap;
    onChange?: (name: string, value: string) => void;
    errors?: PersonalInformationFieldErrorMap;
}

function PersonalInformation({
    mode = "readOnly",
    values,
    fieldMap,
    onChange,
    errors = {},
}: PersonalInformationProps) {
    const isReadOnly = mode === "readOnly";

    const inputStyle =
        "w-full px-4 py-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-600 appearance-none";
    const labelStyle =
        "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1";

    const errorBorderStyle = (field: string) => (errors[field] ? "border-red-500" : "");
    const errorText = (field: string) => errors[field];

    const get = (key: string) => {
        const v = values[key];
        return v === null || v === undefined ? "" : String(v);
    };

    const handleFieldChange =
        (fieldKey?: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            if (isReadOnly || !onChange || !fieldKey) return;
            onChange(fieldKey, e.target.value);
        };

    return (
        <div className="space-y-6">
            {/* NAME OF BENEFICIARY SECTION */}
            <div className="border-b-2 border-teal-600 pb-2">
                <h3 className="text-lg font-bold text-gray-800">Name of Beneficiary</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className={labelStyle}>First Name</label>
                    <input type="text" value={get(fieldMap.firstName)} onChange={handleFieldChange(fieldMap.firstName)} disabled={isReadOnly} className={`${inputStyle} ${errorBorderStyle(fieldMap.firstName)}`} />
                    {errorText(fieldMap.firstName) && <p className="text-red-500 text-xs mt-1">{errorText(fieldMap.firstName)}</p>}
                </div>
                <div>
                    <label className={labelStyle}>Middle Name</label>
                    <input type="text" value={get(fieldMap.middleName)} onChange={handleFieldChange(fieldMap.middleName)} disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>Last Name</label>
                    <input type="text" value={get(fieldMap.lastName)} onChange={handleFieldChange(fieldMap.lastName)} disabled={isReadOnly} className={`${inputStyle} ${errorBorderStyle(fieldMap.lastName)}`} />
                </div>
                <div>
                    <label className={labelStyle}>Extension Name</label>
                    <input
                        type="text"
                        value={fieldMap.extensionName ? get(fieldMap.extensionName) : ""}
                        onChange={handleFieldChange(fieldMap.extensionName)}
                        placeholder="e.g. Jr., III"
                        disabled={isReadOnly}
                        className={inputStyle}
                    />
                </div>
            </div>

            {/* BIRTHDATE & CONTACT SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                    <label className={labelStyle}>Birthdate (YYYY/MM/DD)</label>
                    <input type="date" value={get(fieldMap.birthDate)} onChange={handleFieldChange(fieldMap.birthDate)} disabled={isReadOnly} className={`${inputStyle} ${errorBorderStyle(fieldMap.birthDate)}`} />
                </div>
                <div>
                    <label className={labelStyle}>Contact No.</label>
                    <input type="text" value={get(fieldMap.contactNumber)} onChange={handleFieldChange(fieldMap.contactNumber)} placeholder="09XXXXXXXXX" disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>Sex</label>
                    <select value={get(fieldMap.gender)} onChange={handleFieldChange(fieldMap.gender)} disabled={isReadOnly} className={inputStyle}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Civil Status</label>
                    <select value={get(fieldMap.civilStatus)} onChange={handleFieldChange(fieldMap.civilStatus)} disabled={isReadOnly} className={inputStyle}>
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Separated">Separated</option>
                        <option value="Widowed">Widowed</option>
                    </select>
                </div>
            </div>

            {/* ADDRESS SECTION */}
            <div className="border-b-2 border-teal-600 pb-2 mt-6">
                <h3 className="text-lg font-bold text-gray-800">Address</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="md:col-span-1">
                    <label className={labelStyle}>Street/Zone No.</label>
                    <input type="text" value={get(fieldMap.streetZone)} onChange={handleFieldChange(fieldMap.streetZone)} disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>Brgy.</label>
                    <input type="text" value={get(fieldMap.barangay)} onChange={handleFieldChange(fieldMap.barangay)} disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>City/Mun.</label>
                    <input type="text" value={get(fieldMap.city)} onChange={handleFieldChange(fieldMap.city)} disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>Province</label>
                    <input type="text" value={get(fieldMap.province)} onChange={handleFieldChange(fieldMap.province)} disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>District</label>
                    <input type="text" value={get(fieldMap.district)} onChange={handleFieldChange(fieldMap.district)} disabled={isReadOnly} className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>Zip Code</label>
                    <input
                        type="text"
                        value={fieldMap.zipCode ? get(fieldMap.zipCode) : ''}
                        onChange={handleFieldChange(fieldMap.zipCode)}
                        disabled={isReadOnly}
                        className={inputStyle}
                    />
                </div>
            </div>
        </div>
    );
}

export default PersonalInformation;