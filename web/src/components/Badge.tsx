interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'default';
  children: React.ReactNode;
}

const variants = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
