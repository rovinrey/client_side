import React from 'react';

type ButtonVariant = 'next' | 'back' | 'submit';

interface FormStepButtonProps {
	type?: 'button' | 'submit';
	variant?: ButtonVariant;
	onClick?: () => void;
	disabled?: boolean;
	loading?: boolean;
	children?: React.ReactNode;
	className?: string;
}

const variantClassMap: Record<ButtonVariant, string> = {
	next: 'bg-slate-900 text-white hover:bg-black',
	back: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
	submit: 'bg-teal-700 text-white hover:bg-teal-800'
};

const FormStepButton: React.FC<FormStepButtonProps> = ({
	type = 'button',
	variant = 'next',
	onClick,
	disabled = false,
	loading = false,
	children,
	className = ''
}) => {
	const baseClass =
		'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed';

	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled || loading}
			className={`${baseClass} ${variantClassMap[variant]} ${className}`}
		>
			{loading ? (
				<span className="flex items-center gap-2">
					<svg
						className="h-4 w-4 animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
						<path
							fill="currentColor"
							className="opacity-75"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
					Processing...
				</span>
			) : (
				children
			)}
		</button>
	);
};

export default FormStepButton;
