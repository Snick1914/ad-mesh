import { X, BellRing } from 'lucide-react';
import { FiredAlert, conditionSymbol, formatTime } from './sensorsApi';

interface ToastProps { alert: FiredAlert; onDismiss: (id: string) => void; }

function AlertToast({ alert, onDismiss }: ToastProps) {
  const isCritical = alert.severity === 'critical';
  return (
    <div className={`w-full rounded-2xl border shadow-2xl backdrop-blur-md p-4 flex items-start gap-3
      animate-slide-in
      ${isCritical
        ? 'bg-red-950/90 border-red-500/50 shadow-red-900/40'
        : 'bg-yellow-950/90 border-yellow-500/50 shadow-yellow-900/40'
      }`}
    >
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
        ${isCritical ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
        <BellRing className={`w-4 h-4 animate-pulse ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}>
            {isCritical ? '🔴 Alerta Crítica' : '🟡 Advertencia'}
          </span>
          <button onClick={() => onDismiss(alert.id)} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-white text-sm font-semibold mt-0.5 truncate">{alert.sensorName}</p>
        <p className="text-gray-300 text-xs mt-0.5">
          <span className="font-mono font-bold text-white">{alert.metricName}</span>
          {' '}es{' '}
          <span className={`font-bold ${isCritical ? 'text-red-300' : 'text-yellow-300'}`}>
            {alert.currentValue} {alert.unit}
          </span>
          {' '}{conditionSymbol[alert.condition]}{' '}
          <span className="font-mono text-gray-400">{alert.threshold} {alert.unit}</span>
        </p>
        <p className="text-[10px] text-gray-500 mt-1.5 font-mono">{formatTime(alert.firedAt)}</p>
      </div>
    </div>
  );
}

interface StackProps { alerts: FiredAlert[]; onDismiss: (id: string) => void; }

export default function AlertToastStack({ alerts, onDismiss }: StackProps) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none w-80">
      {alerts.map(alert => (
        <div key={alert.id} className="pointer-events-auto">
          <AlertToast alert={alert} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
