import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, BellRing, Plus, ChevronDown, AlertTriangle, CheckCircle, Activity, ArrowLeft,
} from 'lucide-react';
import Modal from '../../components/Modal';
import { useSensorsData } from './useSensorsData';
import AlertToastStack from './AlertToastStack';
import {
  API_URL, authHeaders, mapApiRule, conditionLabel, conditionSymbol, formatTime, AlertCondition, AlertSeverity,
} from './sensorsApi';

export default function SensorAlerts() {
  const navigate = useNavigate();
  const {
    sensors, sensorsById,
    alertRules, setAlertRules, firedAlerts,
    toastAlerts, dismissToast,
  } = useSensorsData();

  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [ruleSensorId, setRuleSensorId] = useState('');
  const [ruleMetric, setRuleMetric] = useState('');
  const [ruleCondition, setRuleCondition] = useState<AlertCondition>('gt');
  const [ruleThreshold, setRuleThreshold] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState<AlertSeverity>('warning');

  const deleteRule = async (id: string) => {
    const res = await fetch(`${API_URL}/iot/alert-rules/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setAlertRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleRule = async (id: string) => {
    const res = await fetch(`${API_URL}/iot/alert-rules/${id}/toggle`, { method: 'PATCH', headers: authHeaders() });
    if (res.ok) setAlertRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleMetric || !ruleThreshold || !ruleSensorId) return;
    const dbId = sensors.find(s => s.id === ruleSensorId)?._dbId;
    if (!dbId) return;
    const res = await fetch(`${API_URL}/iot/alert-rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        sensor_id: dbId,
        metric_name: ruleMetric,
        condition: ruleCondition,
        threshold: Number(ruleThreshold),
        severity: ruleSeverity,
      }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setAlertRules(prev => [...prev, mapApiRule(created, sensorsById)]);
    setIsAddRuleOpen(false);
    setRuleThreshold(''); setRuleMetric('');
  };

  const metricsOfRuleSensor = sensors.find(s => s.id === ruleSensorId)?.metrics ?? [];

  return (
    <>
      <AlertToastStack alerts={toastAlerts} onDismiss={dismissToast} />

      <div className="space-y-6 max-w-3xl">
        <div>
          <button onClick={() => navigate('/sensors')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Sensores
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Reglas de Notificación
              </h1>
              <p className="text-sm text-gray-400 mt-1">Alertas automáticas al superar umbrales configurados.</p>
            </div>
            <button onClick={() => setIsAddRuleOpen(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-[#0B0F19] font-bold text-sm px-4 py-2.5 rounded-xl transition-all shrink-0">
              <Plus className="w-4 h-4" /> Nueva Regla
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-white/5 bg-[#161C2D] border border-white/5 rounded-2xl">
          {[
            { label: 'Reglas activas', value: alertRules.filter(r => r.enabled).length, color: 'text-[#00F0FF]' },
            { label: 'Reglas pausadas', value: alertRules.filter(r => !r.enabled).length, color: 'text-gray-400' },
            { label: 'Alertas disparadas', value: firedAlerts.length, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="p-4 text-center">
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {alertRules.length === 0 && (
            <div className="text-center py-10 bg-[#161C2D]/40 border border-white/5 rounded-2xl">
              <BellOff className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No hay reglas configuradas aún.</p>
            </div>
          )}
          {alertRules.map(rule => (
            <div key={rule.id}
              className={`bg-[#161C2D] border rounded-xl p-4 flex items-center justify-between gap-3 transition-all ${rule.enabled ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rule.severity === 'critical' ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
                  <AlertTriangle className={`w-4 h-4 ${rule.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{rule.sensorName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    {rule.metricName} {conditionSymbol[rule.condition]}{' '}
                    <span className={`font-bold ${rule.severity === 'critical' ? 'text-red-300' : 'text-yellow-300'}`}>{rule.threshold}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  rule.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>{rule.severity === 'critical' ? 'Crítico' : 'Aviso'}</span>
                <button onClick={() => toggleRule(rule.id)}
                  className={`p-1.5 rounded-lg border transition-all ${rule.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>
                  {rule.enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded-lg border border-white/5 text-gray-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        {firedAlerts.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Historial de notificaciones
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {firedAlerts.map(fa => (
                <div key={fa.id} className={`flex items-center gap-3 bg-[#161C2D]/60 border rounded-xl px-3 py-2 ${fa.severity === 'critical' ? 'border-red-500/15' : 'border-yellow-500/15'}`}>
                  <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${fa.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-semibold truncate">{fa.sensorName} — {fa.metricName}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Valor: {fa.currentValue} {fa.unit} | {formatTime(fa.firedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nueva Regla */}
      <Modal
        open={isAddRuleOpen}
        onClose={() => setIsAddRuleOpen(false)}
        title="Nueva Regla de Alerta"
        icon={<BellRing className="w-5 h-5 text-yellow-400" />}
        zIndex={60}
      >
        <form onSubmit={handleAddRule} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sensor</label>
            <div className="relative">
              <select value={ruleSensorId} onChange={e => { setRuleSensorId(e.target.value); setRuleMetric(''); }}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none">
                <option value="">— Seleccionar sensor —</option>
                {sensors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Métrica</label>
            <div className="relative">
              <select required value={ruleMetric} onChange={e => setRuleMetric(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none">
                <option value="">— Seleccionar métrica —</option>
                {metricsOfRuleSensor.map(m => (
                  <option key={m.name} value={m.name}>{m.name} (actual: {m.value} {m.unit})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Condición</label>
              <div className="relative">
                <select value={ruleCondition} onChange={e => setRuleCondition(e.target.value as AlertCondition)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none text-sm">
                  {(Object.entries(conditionLabel) as [AlertCondition, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Umbral (valor)</label>
              <input type="number" step="any" required value={ruleThreshold} onChange={e => setRuleThreshold(e.target.value)}
                placeholder="Ej. 50"
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nivel de alerta</label>
            <div className="grid grid-cols-2 gap-2">
              {(['warning', 'critical'] as AlertSeverity[]).map(sev => (
                <button key={sev} type="button" onClick={() => setRuleSeverity(sev)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    ruleSeverity === sev
                      ? sev === 'critical' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                      : 'bg-white/5 border-white/10 text-gray-500'
                  }`}>
                  {sev === 'warning' ? '🟡 Advertencia' : '🔴 Crítico'}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={() => setIsAddRuleOpen(false)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors border border-white/5">Cancelar</button>
            <button type="submit" disabled={!ruleMetric || !ruleThreshold}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-[#0B0F19] font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Crear regla
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
