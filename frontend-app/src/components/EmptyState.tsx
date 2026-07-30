interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#161C2D]/50 border border-white/5 rounded-3xl p-12 text-center">
      <div className="text-gray-600 mb-4 [&>svg]:w-16 [&>svg]:h-16">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-gray-400 max-w-sm">{description}</p>}
    </div>
  );
}
