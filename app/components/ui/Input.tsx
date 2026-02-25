import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
