type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  pulse?: boolean;
}

const toneClass: Record<BadgeTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  info: 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20',
  neutral: 'bg-white/5 text-gray-400 border-white/10',
};

const dotClass: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  danger: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-[#00F0FF]',
  neutral: 'bg-gray-500',
};

export default function StatusBadge({ label, tone, pulse = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${toneClass[tone]}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass[tone]}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass[tone]}`} />
        </span>
      )}
      {label}
    </span>
  );
}
