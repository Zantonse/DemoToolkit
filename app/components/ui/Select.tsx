import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, options, placeholder, loading, className = '', ...props }, ref) => (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-400 dark:disabled:bg-slate-800 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      >
        {!props.multiple && <option value="">{placeholder || `Select ${label || ''}...`}</option>}
        {loading ? (
          <option value="" disabled>Loading...</option>
        ) : (
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))
        )}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';
