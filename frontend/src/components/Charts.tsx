"use client";
import React from "react";

// Lightweight dependency-free SVG charts (line/area, donut, radar).
// Responsive via viewBox; styling driven by props.

export type Series = { label: string; color: string; values: number[]; area?: boolean };

export function LineChart({ labels, series, height = 240, ySuffix = "" }: {
  labels: string[]; series: Series[]; height?: number; ySuffix?: string;
}) {
  const W = 720, H = height, padL = 38, padR = 14, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(1, ...allVals);
  const yMax = niceMax(rawMax);
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / yMax) * innerH;
  const ticks = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="chart" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: ticks + 1 }).map((_, t) => {
        const v = (yMax / ticks) * t;
        return (
          <g key={t}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} className="grid" />
            <text x={padL - 8} y={y(v) + 4} className="axis" textAnchor="end">{fmtNum(v)}{ySuffix}</text>
          </g>
        );
      })}
      {labels.map((lb, i) => (
        <text key={i} x={x(i)} y={H - 8} className="axis" textAnchor="middle">{lb}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const areaPts = `${padL},${y(0)} ${pts} ${x(n - 1)},${y(0)}`;
        return (
          <g key={si}>
            {s.area && <polygon points={areaPts} fill={s.color} opacity={0.12} />}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.4}
              strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="#fff" stroke={s.color} strokeWidth={2} />)}
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({ segments, size = 200, thickness = 26 }: {
  segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="donut">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f3" strokeWidth={thickness} />
        {total > 0 && segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C}
              strokeLinecap="butt" />
          );
          acc += frac;
          return el;
        })}
      </g>
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" className="donut-num">{total}</text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" className="donut-lbl">total</text>
    </svg>
  );
}

export function Radar({ axes, series, max = 100, size = 320 }: {
  axes: string[]; series: { label: string; color: string; values: number[] }[]; max?: number; size?: number;
}) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 46;
  const N = Math.max(axes.length, 1);
  const ang = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, frac: number) => [cx + Math.cos(ang(i)) * R * frac, cy + Math.sin(ang(i)) * R * frac];
  const rings = [0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="radar">
      {rings.map((rr, i) => (
        <polygon key={i} className="grid"
          points={axes.map((_, a) => pt(a, rr).join(",")).join(" ")} fill="none" />
      ))}
      {axes.map((a, i) => {
        const [ex, ey] = pt(i, 1);
        const [lx, ly] = pt(i, 1.16);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} className="grid" />
            <text x={lx} y={ly + 4} textAnchor="middle" className="axis">{a}</text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const poly = s.values.map((v, i) => pt(i, Math.max(0, Math.min(1, v / max))).join(",")).join(" ");
        return (
          <g key={si}>
            <polygon points={poly} fill={s.color} opacity={0.16} stroke={s.color} strokeWidth={2} />
            {s.values.map((v, i) => {
              const [px, py] = pt(i, Math.max(0, Math.min(1, v / max)));
              return <circle key={i} cx={px} cy={py} r={3} fill={s.color} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function niceMax(v: number) {
  if (v <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * pow;
}
function fmtNum(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
