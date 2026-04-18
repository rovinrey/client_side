import React, { useState, useRef } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Professional OTP Input Component
 * - Auto-focus management
 * - Paste support
 * - Copy-to-clipboard ready
 * - Accessible
 */
const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    // Limit to single digit
    const digit = value.slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Notify parent component
    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Auto-move to next input
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits are filled
    if (newOtp.every((val) => val !== '') && onComplete) {
      onComplete(otpString);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];

      if (newOtp[index]) {
        // Clear current input
        newOtp[index] = '';
      } else if (index > 0) {
        // Move to previous input and clear
        newOtp[index - 1] = '';
        inputs.current[index - 1]?.focus();
      }

      setOtp(newOtp);
      onChange?.(newOtp.join(''));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, length);

    if (digits.length > 0) {
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i < length) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);

      const otpString = newOtp.join('');
      onChange?.(otpString);

      // Focus last filled input
      const lastFilledIndex = newOtp.findIndex((val) => val === '');
      if (lastFilledIndex > -1) {
        inputs.current[lastFilledIndex]?.focus();
      } else {
        inputs.current[length - 1]?.focus();
      }

      // Call onComplete if all digits are filled
      if (newOtp.every((val) => val !== '') && onComplete) {
        onComplete(otpString);
      }
    }
  };

  return (
    <div className={`flex gap-2 justify-center ${className}`}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-14 h-14 text-center text-2xl font-bold border-2 rounded-lg
            transition-all duration-200
            ${
              disabled
                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'border-gray-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200'
            }
            ${digit ? 'border-teal-500' : ''}
          `}
          aria-label={`OTP digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
