import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({ label, error, helpText, id, className = '', ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-surface-700">
          {label}
          {props.required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 text-sm border rounded-md bg-white placeholder-surface-400 transition-colors
          ${error
            ? 'border-error-400 focus:ring-error-400 focus:border-error-400'
            : 'border-surface-300 focus:ring-accent-400 focus:border-accent-400'
          }
          focus:outline-none focus:ring-2 ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-error-600">{error}</p>
      )}
      {helpText && !error && (
        <p id={`${inputId}-help`} className="text-xs text-surface-500">{helpText}</p>
      )}
    </div>
  );
}
