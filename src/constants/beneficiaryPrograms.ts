export type ProgramKey = 'TUPAD' | 'SPES' | 'DILP' | 'GIP' | 'JOBSEEKERS';

export interface BeneficiaryProgramDefinition {
    value: ProgramKey;
    label: string;
    short_label: string;
    description: string;
    has_requirements_submitter: boolean;
}

export const BENEFICIARY_SELECTED_PROGRAM_KEY = 'beneficiary_selected_program';

export const BENEFICIARY_PROGRAMS: BeneficiaryProgramDefinition[] = [
    {
        value: 'TUPAD',
        label: 'TUPAD — Emergency Employment',
        short_label: 'TUPAD',
        description: 'Emergency employment assistance for displaced, underemployed, and seasonal workers.',
        has_requirements_submitter: true,
    },
    {
        value: 'SPES',
        label: 'SPES — Student Employment',
        short_label: 'SPES',
        description: 'Student employment support with document submission and application review.',
        has_requirements_submitter: true,
    },
    {
        value: 'DILP',
        label: 'DILP — Livelihood Program',
        short_label: 'DILP',
        description: 'Livelihood assistance program for beneficiaries building sustainable income sources.',
        has_requirements_submitter: true,
    },
    {
        value: 'GIP',
        label: 'GIP — Government Internship Program',
        short_label: 'GIP',
        description: 'Internship placement for young workers in government offices and partner institutions.',
        has_requirements_submitter: true,
    },
    {
        value: 'JOBSEEKERS',
        label: 'Job Seekers Assistance',
        short_label: 'Job Seekers',
        description: 'Employment assistance and intake support for job seekers and placement applicants.',
        has_requirements_submitter: true,
    },
];

export function is_program_key(value: string | null): value is ProgramKey {
    return BENEFICIARY_PROGRAMS.some((program) => program.value === value);
}

export function get_program_definition(program_key: ProgramKey): BeneficiaryProgramDefinition {
    return BENEFICIARY_PROGRAMS.find((program) => program.value === program_key) ?? BENEFICIARY_PROGRAMS[0];
}