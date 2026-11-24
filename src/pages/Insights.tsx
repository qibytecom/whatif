import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHead } from "../components/layout/Shell";
import { InsightPanel, Card, SectionTitle } from "../components/common";
import { ReversePanel, StressPanel } from "../components/simulator/Analysis";
import { useStore } from "../lib/storage";
import { baseline } from "../data/demo";
import { simulate } from "../lib/simulation";
import { number, percent } from "../lib/formatters";
export default function Insights() {
  const { business: b, scenarios } = useStore((s) => s.data);
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? "baseline");
  const s = scenarios.find((x) => x.id === id) ?? baseline(b);
  const r = simulate(b, s);
  return (
    <>
      <PageHead
        title="Lebih dari sekadar angka."
        sub="Pahami batas kapasitas, ketahanan keputusan, dan jalan menuju target."
        action={
          <label className="select-label">
            Analisis skenario
            <select value={s.id} onChange={(e) => setId(e.target.value)}>
              <option value="baseline">Kondisi awal</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <div className="analysis-grid">
        <div>
          <ReversePanel b={b} s={s} />
          <Card>
            <SectionTitle
              title="Batas operasional"
              sub="Kapasitas adalah batas, bukan jaminan penjualan."
            />
            <div className="capacity-big">
              <strong>{percent(r.utilization)}</strong>
              <span>kapasitas terpakai</span>
            </div>
            <div className="meter">
              <i style={{ width: `${r.utilization}%` }} />
            </div>
            <dl className="definition-list">
              <div>
                <dt>Permintaan / hari</dt>
                <dd>{number(r.demand)}</dd>
              </div>
              <div>
                <dt>Kapasitas / hari</dt>
                <dd>{number(r.capacity)}</dd>
              </div>
              <div>
                <dt>Belum terlayani / hari</dt>
                <dd>{number(r.unserved)}</dd>
              </div>
            </dl>
          </Card>
        </div>
        <InsightPanel b={b} s={s} />
      </div>
      <StressPanel b={b} s={s} />
    </>
  );
}
