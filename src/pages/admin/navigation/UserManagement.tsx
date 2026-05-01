import { useState } from 'react';
import { AxiosError } from 'axios';
import { 
  Users, 
  UserPlus, 
  Loader, 
  AlertCircle, 
  CheckCircle,
  EyeIcon,
  EyeOff,
} from 'lucide-react';
import { createUser } from '../../../api/auth.api';

interface CreateUserData {
  user_name: string;
  identifier: string;
  password: string;
  role: 'admin' | 'staff';
}

const NAME_REGEX = /^[a-zA-Z\s.\-']+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const UserManagement = () => {
  const [formData, setFormData] = useState<CreateUserData>({
    user_name: '',
    identifier: '',
    password: '',
    role: 'staff',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
    setSuccess(null);
  };

  const validate = (): string | null => {
    const trimmedName = formData.user_name.trim();
    const trimmedIdentifier = formData.identifier.trim();

    if (!trimmedName || !trimmedIdentifier || !formData.password) {
      return 'All fields are required.';
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return 'Username must be between 2 and 50 characters.';
    }

    if (!NAME_REGEX.test(trimmedName)) {
      return 'Username contains invalid characters.';
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await createUser({
        user_name: formData.user_name.trim(),
        identifier: formData.identifier.trim(),
        password: formData.password,
        role: formData.role,
      });

      setSuccess(result.message);
      setFormData({
        user_name: '',
        identifier: '',
        password: '',
        role: 'staff',
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || 'Failed to create user. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="text-blue-600" size={28} />
          User Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Create admin or staff accounts. Beneficiaries can self-register through the signup page.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
          <CheckCircle size={20} />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Create User Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} />
            Create New User
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isLoading}
              className={inputClass}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Admin has full access. Staff has limited privileges.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="user_name"
              placeholder="Enter full name"
              value={formData.user_name}
              onChange={handleChange}
              required
              maxLength={50}
              disabled={isLoading}
              className={inputClass}
            />
          </div>

          {/* Email or Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email or Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="identifier"
              placeholder="Enter email or phone number"
              value={formData.identifier}
              onChange={handleChange}
              required
              maxLength={254}
              disabled={isLoading}
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
                maxLength={128}
                disabled={isLoading}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              At least 8 characters with uppercase, lowercase, number, and special character.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Creating...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Create User
              </>
            )}
          </button>
        </form>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Only admins can create new admin or staff accounts.</li>
          <li>Beneficiaries can self-register through the public signup page.</li>
          <li>All passwords must meet security requirements.</li>
          <li>Created users can log in immediately with their credentials.</li>
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;
