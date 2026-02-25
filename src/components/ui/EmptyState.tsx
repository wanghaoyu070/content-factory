import Link from 'next/link';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-4 text-[#666]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">{title}</h3>
      <p className="text-sm text-[#666] max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-[#333] text-white hover:bg-[#444] shadow-md"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-[#333] text-white hover:bg-[#444] shadow-md"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
