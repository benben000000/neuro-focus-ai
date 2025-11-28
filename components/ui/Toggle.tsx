import React from 'react';
import { playClick } from '../../services/sound';

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  disabled = false,
  onChange,
  label,
  className = '',
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    playClick();
    onChange?.(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      playClick();
      onChange?.(!checked);
    }
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label || `Toggle ${checked ? 'on' : 'off'}`}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-7 w-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked
            ? 'bg-indigo-600 dark:bg-indigo-500'
            : 'bg-slate-300 dark:bg-slate-600'
        } ${!disabled ? 'cursor-pointer hover:' + (checked ? 'bg-indigo-700 dark:bg-indigo-600' : 'bg-slate-400 dark:bg-slate-500') : ''}`}
        {...props}
      >
        <span
          className={`${
            checked ? 'translate-x-5' : 'translate-x-1'
          } inline-block h-6 w-6 transform rounded-full bg-white dark:bg-slate-200 shadow-md transition-transform duration-200`}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
      )}
    </div>
  );
};
