import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { SensorDevice, TelemetryRecord } from './sensorsApi';

interface TelemetryChartProps {
  sensors: SensorDevice[];
  telemetryHistory: TelemetryRecord[];
}

export default function TelemetryTrendChart({ sensors, telemetryHistory }: TelemetryChartProps) {
  const [selectedSensorCode, setSelectedSensorCode] = useState<string>(
    sensors[0]?.id || ''
  );
  const [selectedMetricName, setSelectedMetricName] = useState<string>('');

  const currentSensor = sensors.find((s) => s.id === selectedSensorCode) || sensors[0];

  // Métricas disponibles para el sensor seleccionado (excluir status si hay métricas numéricas reales)
  const availableMetrics = useMemo(() => {
    if (!currentSensor) return [];
    const names = currentSensor.metrics.map((m) => m.name);
    // Ordenar para priorizar temperatura/humedad/voltaje antes que sensor_status
    return [...names].sort((a, b) => {
      if (a === 'sensor_status') return 1;
      if (b === 'sensor_status') return -1;
      return 0;
    });
  }, [currentSensor]);

  const activeMetricName = selectedMetricName && availableMetrics.includes(selectedMetricName)
    ? selectedMetricName
    : availableMetrics[0] || '';

  // Filtrar lecturas cronológicas del sensor y métrica elegida
  const chartData = useMemo(() => {
    if (!currentSensor) return [];

    // Buscar en historial
    const records = telemetryHistory
      .filter((t) => t.sensorCode === currentSensor.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const points: { time: string; value: number; unit: string }[] = [];

    for (const r of records) {
      const targetMetric = r.metrics.find((m) => m.name === activeMetricName);
      if (targetMetric && typeof targetMetric.value === 'number') {
        points.push({
          time: new Date(r.createdAt).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          value: targetMetric.value,
          unit: targetMetric.unit || '',
        });
      }
    }

    // Si aún hay pocos puntos en el histórico, incluir la métrica en vivo
    if (points.length < 2) {
      const liveMetric = currentSensor.metrics.find((m) => m.name === activeMetricName);
      if (liveMetric) {
        points.push({
          time: currentSensor.lastSeen || 'Actual',
          value: liveMetric.value,
          unit: liveMetric.unit || '',
        });
      }
    }

    return points;
  }, [currentSensor, telemetryHistory, activeMetricName]);

  if (!currentSensor || availableMetrics.length === 0) {
    return null;
  }

  // Cálculos de Min, Max, Promedio y Fluctuación
  const values = chartData.map((d) => d.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;
  const avgVal = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0;
  const unit = chartData[0]?.unit || '';
  const currentVal = values.length > 0 ? values[values.length - 1] : 0;

  // Generar coordenadas SVG
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const range = maxVal === minVal ? (maxVal === 0 ? 1 : Math.abs(maxVal * 0.2) || 1) : maxVal - minVal;
  const graphMin = maxVal === minVal ? minVal - range : minVal;
  const graphMax = maxVal === minVal ? maxVal + range : maxVal;
  const graphRange = graphMax - graphMin || 1;

  const coordinates = chartData.map((d, index) => {
    const x =
      chartData.length === 1
        ? paddingX + innerWidth / 2
        : paddingX + (index / (chartData.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - ((d.value - graphMin) / graphRange) * innerHeight;
    return { x, y, ...d };
  });

  const pathD =
    coordinates.length > 0
      ? coordinates.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
      : '';

  const areaD =
    coordinates.length > 0
      ? `${pathD} L ${coordinates[coordinates.length - 1].x} ${height - paddingY} L ${coordinates[0].x} ${height - paddingY} Z`
      : '';

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00F0FF]" /> Fluctuación y Tendencia de Métricas
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Monitoreo dinámico del comportamiento de telemetría en el tiempo.
          </p>
        </div>

        {/* Selectores de Sensor y Métrica */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={currentSensor.id}
            onChange={(e) => {
              setSelectedSensorCode(e.target.value);
              setSelectedMetricName('');
            }}
            className="bg-[#161C2D] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#00F0FF] transition-all"
          >
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>

          <select
            value={activeMetricName}
            onChange={(e) => setSelectedMetricName(e.target.value)}
            className="bg-[#161C2D] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-[#00F0FF] focus:outline-none focus:border-[#00F0FF] transition-all uppercase"
          >
            {availableMetrics.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjeta de Gráfica */}
      <div className="bg-[#161C2D] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-6">
        {/* KPI Mini Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-white/5">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Valor Actual</span>
            <p className="text-2xl font-black text-white mt-0.5 font-mono">
              {currentVal} <span className="text-xs text-gray-400 font-sans">{unit}</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mínimo</span>
            <p className="text-lg font-extrabold text-blue-400 mt-0.5 font-mono">
              {minVal.toFixed(2)} <span className="text-xs text-gray-400 font-sans">{unit}</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Promedio</span>
            <p className="text-lg font-extrabold text-emerald-400 mt-0.5 font-mono">
              {avgVal} <span className="text-xs text-gray-400 font-sans">{unit}</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Máximo</span>
            <p className="text-lg font-extrabold text-orange-400 mt-0.5 font-mono">
              {maxVal.toFixed(2)} <span className="text-xs text-gray-400 font-sans">{unit}</span>
            </p>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full h-60">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Guías horizontales de fondo */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingY + innerHeight * pct;
              const val = (graphMax - pct * graphRange).toFixed(1);
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Área sombreada */}
            {areaD && <path d={areaD} fill="url(#chartGradient)" />}

            {/* Línea de tendencia */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#00F0FF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]"
              />
            )}

            {/* Puntos de datos */}
            {coordinates.map((pt, i) => (
              <g key={i} className="cursor-pointer group">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#0B0F19"
                  stroke="#00F0FF"
                  strokeWidth="2.5"
                  className="transition-all hover:r-6"
                />
                {/* Tooltip simple en hover */}
                <title>{`${pt.time}: ${pt.value} ${pt.unit}`}</title>
              </g>
            ))}
          </svg>
        </div>

        {/* Eje X (Tiempos) */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono px-4 pt-2 border-t border-white/5">
          <span>{chartData[0]?.time || 'Inicio'}</span>
          <span>
            {chartData.length > 2 ? chartData[Math.floor(chartData.length / 2)]?.time : 'Transcurso'}
          </span>
          <span>{chartData[chartData.length - 1]?.time || 'Actual'}</span>
        </div>
      </div>
    </section>
  );
}
