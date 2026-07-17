'use client';

import { useMemo, useRef, useState } from 'react';

type Point = { date: string; spend: number; leads: number };
type Props = { series: Point[]; currency?: string | null };
type Metric = 'leads' | 'spend';

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

// מרחב קואורדינטות קבוע (ה-SVG נמתח ל-100% רוחב)
const W = 720;
const H = 200;
const PAD = { l: 44, r: 12, t: 14, b: 24 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function ddmm(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function DashboardTrend({ series, currency }: Props) {
  const [metric, setMetric] = useState<Metric>('leads');
  const [hoverI, setHoverI] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cur = currency || '';
  const fmt = (v: number) => (metric === 'spend' ? `${nf0.format(v)}${cur ? ' ' + cur : ''}` : nf0.format(v));

  const n = series.length;
  const values = useMemo(() => series.map((p) => (metric === 'spend' ? p.spend : p.leads)), [series, metric]);
  const max = useMemo(() => niceMax(Math.max(1, ...values)), [values]);

  const x = (i: number) => (n <= 1 ? PAD.l + PLOT_W / 2 : PAD.l + (i / (n - 1)) * PLOT_W);
  const y = (v: number) => PAD.t + PLOT_H - (v / max) * PLOT_H;

  const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaPath =
    n > 0
      ? `M${x(0).toFixed(1)},${(PAD.t + PLOT_H).toFixed(1)} ` +
        values.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') +
        ` L${x(n - 1).toFixed(1)},${(PAD.t + PLOT_H).toFixed(1)} Z`
      : '';

  const gridVals = [0, max / 2, max];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (vx - PAD.l) / PLOT_W;
    const i = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    setHoverI(i);
  }

  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div className="trend">
      <div className="trend-head">
        <div className="trend-title">
          מגמה · {metric === 'leads' ? 'לידים' : 'הוצאה'}
          <span className="trend-total">סה״כ {fmt(total)}</span>
        </div>
        <div className="period-toggle">
          <button className={`period-btn ${metric === 'leads' ? 'active' : ''}`} onClick={() => setMetric('leads')}>
            לידים
          </button>
          <button className={`period-btn ${metric === 'spend' ? 'active' : ''}`} onClick={() => setMetric('spend')}>
            הוצאה
          </button>
        </div>
      </div>

      <div className="trend-plot" dir="ltr">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="trend-svg"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverI(null)}
          role="img"
          aria-label={`מגמת ${metric === 'leads' ? 'לידים' : 'הוצאה'} לאורך זמן`}
        >
          {/* גריד אופקי + תוויות ציר Y */}
          {gridVals.map((gv, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(gv)} y2={y(gv)} className="trend-grid" />
              <text x={PAD.l - 6} y={y(gv) + 3} className="trend-ytick" textAnchor="end">
                {nf0.format(gv)}
              </text>
            </g>
          ))}

          {/* שטח + קו */}
          {areaPath && <path d={areaPath} className="trend-area" />}
          <path d={linePath} className="trend-line" fill="none" />

          {/* תוויות ציר X — התחלה / אמצע / סוף */}
          {n > 0 &&
            [0, Math.floor((n - 1) / 2), n - 1]
              .filter((v, idx, a) => a.indexOf(v) === idx)
              .map((i) => (
                <text key={i} x={x(i)} y={H - 6} className="trend-xtick" textAnchor="middle">
                  {ddmm(series[i].date)}
                </text>
              ))}

          {/* crosshair + נקודה */}
          {hoverI != null && (
            <g>
              <line x1={x(hoverI)} x2={x(hoverI)} y1={PAD.t} y2={PAD.t + PLOT_H} className="trend-crosshair" />
              <circle cx={x(hoverI)} cy={y(values[hoverI])} r={4} className="trend-dot" />
            </g>
          )}
        </svg>

        {hoverI != null && (
          <div
            className="trend-tip"
            style={{ left: `${(x(hoverI) / W) * 100}%`, top: `${(y(values[hoverI]) / H) * 100}%` }}
          >
            <div className="trend-tip-date">{ddmm(series[hoverI].date)}</div>
            <div className="trend-tip-val">{fmt(values[hoverI])}</div>
          </div>
        )}
      </div>
    </div>
  );
}
