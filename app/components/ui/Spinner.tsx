interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-3.5 w-3.5 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-sky-500 border-t-transparent dark:border-sky-400 dark:border-t-transparent ${sizeStyles[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
