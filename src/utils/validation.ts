/**
 * Shared form validation helpers for all beneficiary application forms.
 * Works with both controlled components and plain objects.
 */

export interface ValidationError {
  field: string;
  message: string;
}

// ── Primitives ──────────────────────────────────────

export const isNonEmpty = (val: unknown): boolean =>
  val !== null && val !== undefined && typeof val === 'string' ? val.trim().length > 0 : String(val || '').trim().length > 0;

export const isMinLength = (val: string, min: number): boolean =>
  val.trim().length >= min;

export const isValidDate = (val: string): boolean => {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
};

export const isPastDate = (val: string): boolean => {
  if (!isValidDate(val)) return false;
  return new Date(val) <= new Date();
};

export const isValidPhone = (val: string): boolean => {
  if (!val) return false;
  // Cleans out all non-digit characters
  const digits = val.replace(/\D/g, '');
  // Matches local formats: 09XXXXXXXXX (11 digits) or 639XXXXXXXXX (12 digits)
  return (digits.length === 11 && digits.startsWith('09')) || 
         (digits.length === 12 && digits.startsWith('639')) || 
         (digits.length >= 7 && digits.length <= 15); // Broad fallback
};

export const isValidEmail = (val: string): boolean => {
  if (!val) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
};

export const isPositiveNumber = (val: string | number): boolean => {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return !isNaN(n) && n > 0;
};

export const isNonNegativeNumber = (val: string | number): boolean => {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return !isNaN(n) && n >= 0;
};

export const calculateAge = (birthDate: string): number | null => {
  if (!isValidDate(birthDate)) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

// ── Per-form validators ─────────────────────────────

export const validateTupadForm = (data: Record<string, unknown>): ValidationError[] => {
  const errors: ValidationError[] = [];
  const firstName = String(data.first_name || data.firstName || '');
  const lastName = String(data.last_name || data.lastName || '');
  const dob = String(data.date_of_birth || data.birth_date || data.birthDate || '');

  if (!isMinLength(firstName, 2))
    errors.push({ field: 'first_name', message: 'First name is required (min 2 chars)' });
  if (!isMinLength(lastName, 2))
    errors.push({ field: 'last_name', message: 'Last name is required (min 2 chars)' });
  
  if (!dob || !isPastDate(dob)) {
    errors.push({ field: 'date_of_birth', message: 'Valid birth date is required' });
  } else {
    const age = calculateAge(dob);
    if (age !== null && age < 18) {
      errors.push({ field: 'date_of_birth', message: 'Must be at least 18 years old' });
    }
  }

  const contact = String(data.contact_number || data.contactNumber || '');
  if (!isNonEmpty(contact))
    errors.push({ field: 'contact_number', message: 'Contact number is required' });
  else if (!isValidPhone(contact))
    errors.push({ field: 'contact_number', message: 'Invalid phone number format' });

  if (!isNonEmpty(data.valid_id_type || data.validIdType))
    errors.push({ field: 'valid_id_type', message: 'ID type is required' });
  if (!isNonEmpty(data.id_number || data.idNumber))
    errors.push({ field: 'id_number', message: 'ID number is required' });
  if (!isNonEmpty(data.address))
    errors.push({ field: 'address', message: 'Address is required' });

  return errors;
};

export const validateDilpForm = (data: Record<string, unknown>): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!isMinLength(String(data.proponent_name || data.proponentName || ''), 2))
    errors.push({ field: 'proponent_name', message: 'Proponent name is required' });
  if (!isMinLength(String(data.project_title || data.projectTitle || ''), 2))
    errors.push({ field: 'project_title', message: 'Project title is required' });
  if (!isPositiveNumber(String(data.proposed_amount || data.proposedAmount || '')))
    errors.push({ field: 'proposed_amount', message: 'Proposed amount must be a positive number' });

  const mobile = String(data.mobile_number || data.mobileNumber || '');
  if (!isNonEmpty(mobile))
    errors.push({ field: 'mobile_number', message: 'Mobile number is required' });
  else if (!isValidPhone(mobile))
    errors.push({ field: 'mobile_number', message: 'Invalid phone number format' });

  const amount = parseFloat(String(data.proposed_amount || data.proposedAmount || '0'));
  if (amount > 10000000)
    errors.push({ field: 'proposed_amount', message: 'Amount cannot exceed ₱10,000,000' });

  return errors;
};

export const validateGipForm = (data: Record<string, unknown>): ValidationError[] => {
  const errors: ValidationError[] = [];
  const firstName = String(data.firstName || data.first_name || '');
  const lastName = String(data.lastName || data.last_name || '');

  if (!isMinLength(firstName, 2))
    errors.push({ field: 'firstName', message: 'First name is required (min 2 chars)' });
  if (!isMinLength(lastName, 2))
    errors.push({ field: 'lastName', message: 'Last name is required (min 2 chars)' });
  if (!isNonEmpty(data.barangay))
    errors.push({ field: 'barangay', message: 'Barangay is required' });
  if (!isNonEmpty(data.school))
    errors.push({ field: 'school', message: 'School is required for GIP' });
  if (!isNonEmpty(data.course))
    errors.push({ field: 'course', message: 'Course/Degree is required for GIP' });

  const birthDate = String(data.birthDate || data.birth_date || data.date_of_birth || '');
  if (!birthDate || !isPastDate(birthDate)) {
    errors.push({ field: 'birthDate', message: 'Valid birth date is required' });
  } else {
    const age = calculateAge(birthDate);
    if (age !== null && age < 18) errors.push({ field: 'birthDate', message: 'Must be at least 18 years old' });
    if (age !== null && age > 30) errors.push({ field: 'birthDate', message: 'GIP is for ages 30 and below' });
  }

  return errors;
};

export const validateJobSeekerForm = (data: Record<string, unknown>): ValidationError[] => {
  const errors: ValidationError[] = [];
  const fullName = String(data.fullName || data.full_name || '');

  if (!isMinLength(fullName, 2))
    errors.push({ field: 'fullName', message: 'Full name is required (min 2 chars)' });

  const contact = String(data.contactNumber || data.contact_number || '');
  if (!isNonEmpty(contact))
    errors.push({ field: 'contactNumber', message: 'Contact number is required' });
  else if (!isValidPhone(contact))
    errors.push({ field: 'contactNumber', message: 'Invalid phone number format' });

  const yoe = String(data.yearsOfExperience || data.years_of_experience || '');
  if (yoe && (isNaN(parseFloat(yoe)) || parseFloat(yoe) < 0 || parseFloat(yoe) > 60))
    errors.push({ field: 'yearsOfExperience', message: 'Years of experience must be 0-60' });

  return errors;
};

export const validateProgramForm = (data: Record<string, unknown>): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!isMinLength(String(data.name || ''), 2))
    errors.push({ field: 'name', message: 'Program name is required (min 2 chars)' });
  if (!isNonEmpty(data.location))
    errors.push({ field: 'location', message: 'Location is required' });
  if (!isPositiveNumber(String(data.slots || '')))
    errors.push({ field: 'slots', message: 'Slots must be a positive number' });
  if (!isPositiveNumber(String(data.budget || '')))
    errors.push({ field: 'budget', message: 'Budget must be a positive number' });

  const startDate = String(data.start_date || data.startDate || '');
  const endDate = String(data.end_date || data.endDate || '');
  if (startDate && endDate && new Date(endDate) < new Date(startDate))
    errors.push({ field: 'end_date', message: 'End date cannot be before start date' });

  return errors;
};

/**
 * Format validation errors into a single string for rapid UI alerts.
 */
export const formatErrors = (errors: ValidationError[]): string =>
  errors.map(e => e.message).join('\n');