import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { GitBranch, ArrowUpRight } from "lucide-react";
import { compact, number, percent, rupiah } from "../lib/formatters";
import type { Business, Result, Scenario } from "../types";
import { insights, simulate } from "../lib/simulation";
export function Logo() {
  return (
    <span className="logo">
      <svg
        width="30"
        height="34"
        viewBox="0 0 30 34"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 5v10c0 8 20 2 20 13M25 5v10c0 8-20 2-20 13"
          stroke="currentColor"
          strokeWidth="3.2"
        />
        <circle cx="5" cy="4" r="3" fill="currentColor" />
        <circle cx="25" cy="4" r="3" fill="currentColor" />
      </svg>
      WhatIf<span className="logo-dot">®</span>
    </span>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function KPIs({ r, base }: { r: Result; base?: Result }) {
  return (
    <div className="kpi-grid">
      {[
        {
          label: "Laba operasional / bulan",
          value: rupiah(r.profit),
          sub: base
            ? `${r.profit >= base.profit ? "+" : ""}${rupiah(r.profit - base.profit)} dari kondisi awal`
            : "Setelah seluruh biaya operasional",
          dark: true,
        },
        {
          label: "Omzet / bulan",
          value: rupiah(r.revenue),
          sub: `${number(r.orders)} pesanan terlayani`,
        },
        {
          label: "Margin kontribusi / pesanan",
          value: rupiah(r.contribution),
          sub: "Harga jual dikurangi biaya variabel",
        },
        {
          label: "Kapasitas terpakai",
          value: percent(r.utilization),
          sub: `${number(r.dailyOrders)} dari ${number(r.capacity)} pesanan / hari`,
        },
      ].map((k) => (
        <Card key={k.label} className={`kpi ${k.dark ? "dark" : ""}`}>
          <div className="kpi-label">
            {k.label}
            <ArrowUpRight size={16} />
          </div>
          <strong className={r.profit < 0 && k.dark ? "negative" : ""}>
            {k.value}
          </strong>
          <p>{k.sub}</p>
          {!k.dark && k.label === "Kapasitas terpakai" && (
            <div className="meter">
              <i style={{ width: `${r.utilization}%` }} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
export function ComparisonChart({
  data,
}: {
  data: { name: string; revenue: number; profit: number }[];
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Grafik perbandingan omzet dan laba operasional dalam Rupiah"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={6}
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e9e9e9"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#77777d" }}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            width={65}
            tick={{ fontSize: 12, fill: "#77777d" }}
          />
          <Tooltip
            formatter={(v) => rupiah(Number(v))}
            contentStyle={{ borderRadius: 10, border: "1px solid #e7e7e7" }}
          />
          <Legend iconType="square" />
          <Bar
            isAnimationActive={false}
            name="Omzet"
            dataKey="revenue"
            fill="#d9d9d8"
            radius={[5, 5, 0, 0]}
            maxBarSize={42}
          />
          <Bar
            isAnimationActive={false}
            name="Laba operasional"
            dataKey="profit"
            fill="#19181e"
            radius={[5, 5, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function InsightPanel({ b, s }: { b: Business; s: Scenario }) {
  return (
    <Card className="dark insight">
      <div className="eyebrow">
        <GitBranch size={17} /> INSIGHT KEPUTUSAN
      </div>
      <h2>
        Angka bercerita.
        <br />
        Anda yang memutuskan.
      </h2>
      {insights(b, s).map((text, i) => (
        <p className={i === 0 ? "insight-lead" : ""} key={text}>
          {text}
        </p>
      ))}
      <div className="insight-foot">
        Berdasarkan asumsi Anda, bukan prediksi pasar.
      </div>
    </Card>
  );
}
export function ComparisonTable({
  b,
  scenarios,
}: {
  b: Business;
  scenarios: Scenario[];
}) {
  const base = simulate(b);
  const rows = [
    { name: "Kondisi awal", r: base },
    ...scenarios.map((s) => ({ name: s.name, r: simulate(b, s) })),
  ];
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Indikator bulanan</th>
            {rows.map((x, i) => (
              <th key={i}>{x.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: "Omzet", f: (r: Result) => rupiah(r.revenue) },
            { label: "Laba operasional", f: (r: Result) => rupiah(r.profit) },
            {
              label: "Selisih laba",
              f: (r: Result) => rupiah(r.profit - base.profit),
            },
            { label: "Pesanan terlayani", f: (r: Result) => number(r.orders) },
            {
              label: "Permintaan tak terlayani / hari",
              f: (r: Result) => number(r.unserved),
            },
            {
              label: "Kapasitas terpakai",
              f: (r: Result) => percent(r.utilization),
            },
            {
              label: "Biaya tambahan",
              f: (r: Result) => rupiah(r.additionalCosts),
            },
            {
              label: "Margin operasional",
              f: (r: Result) => percent(r.margin),
            },
          ].map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {rows.map((x, i) => (
                <td key={i}>{row.f(x.r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
