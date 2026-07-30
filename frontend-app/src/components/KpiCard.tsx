type KpiTone = 'default' | 'success' | 'danger' | 'warning' | 'info';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: KpiTone;
}

const toneClass: Record<KpiTone, string> = {
  default: 'text-white',
  success: 'text-emerald-400',
  danger: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-[#00F0FF]',
};

const iconWrapClass: Record<KpiTone, string> = {
  default: 'bg-white/5 border-white/10 text-gray-300',
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  danger: 'bg-red-500/10 border-red-500/20 text-red-400',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  info: 'bg-[#00F0FF]/10 border-[#00F0FF]/20 text-[#00F0FF]',
};

export default function KpiCard({ icon, label, value, sublabel, tone = 'default' }: KpiCardProps) {
  return (
    <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${iconWrapClass[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold mt-1 ${toneClass[tone]}`}>{value}</p>
        {sublabel && <p className="text-[11px] text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
