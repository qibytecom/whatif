import { Card, SectionTitle, ComparisonChart } from "../common";
import { NumericField } from "./ScenarioFields";
import { reverse, stressTest } from "../../lib/simulation";
import { useStore } from "../../lib/storage";
import type { Business, Scenario } from "../../types";
import { rupiah, number } from "../../lib/formatters";
export function ReversePanel({
  b,
  s,
  readOnly = false,
}: {
  b: Business;
  s: Scenario;
  readOnly?: boolean;
}) {
  const { data, commit } = useStore();
  const r = reverse(b, s, data.target);
  return (
    <Card>
      <SectionTitle
        title="Mulai dari tujuan Anda"
        sub="Berapa pesanan untuk mencapai laba yang Anda inginkan?"
      />
      {!readOnly ? (
        <NumericField
          label="Target laba operasional / bulan"
          unit="Rp"
          value={data.target}
          onChange={(target) => commit({ ...data, target })}
        />
      ) : (
        <p>
          Target laba: <b>{rupiah(data.target)}</b>
        </p>
      )}
      <div className="reverse-result">
        <div>
          <span>
            {r.stockConditional
              ? "Kebutuhan bersyarat / bulan"
              : "Minimal pesanan / bulan"}
          </span>
          <strong>
            {r.required === null ? "Tidak tercapai" : number(r.required)}
          </strong>
          <small>
            {r.daily === null
              ? "Margin kontribusi tidak positif"
              : `≈ ${number(r.daily)} pesanan / hari rata-rata`}
          </small>
        </div>
        <span className={`badge ${r.feasible ? "" : "badge-warning"}`}>
          {r.feasible ? "Kapasitas memadai" : "Target tidak layak"}
        </span>
      </div>
      <div className="form-grid">
        <div className="mini-stat">
          <span>Kapasitas / bulan</span>
          <b>{number(r.maxOrders)} pesanan</b>
        </div>
        <div className="mini-stat">
          <span>Tambahan permintaan / hari</span>
          <b>{r.demandGap === null ? "—" : number(r.demandGap)}</b>
        </div>
      </div>
      <p className={r.feasible ? "helper" : "warning"}>
        {r.feasible
          ? `Secara kapasitas, target memungkinkan. Permintaan aktual tetap perlu mencapai ${number(r.required ?? 0)} pesanan per bulan; jumlah ini belum dijamin oleh proyeksi.`
          : r.required === null
            ? "Kontribusi per pesanan tidak positif. Naikkan harga atau turunkan biaya variabel sebelum mengejar target ini."
            : r.stockConditional && r.required <= r.maxOrders
              ? `Kebijakan stok belum memenuhi target. Hasil terbaik dari kondisi saat ini dan uji permintaan pada kapasitas penuh: ${rupiah(r.maxProfit)}. Tinjau titik pesan ulang, jumlah pembelian, atau waktu tunggu.`
              : `Kebutuhan melebihi kapasitas sebanyak ${number(Math.max(0, r.required - r.maxOrders))} pesanan per bulan. Tambah kapasitas, tingkatkan kontribusi per pesanan, atau tinjau target. Hasil pada kapasitas ini ${rupiah(r.maxProfit)}.`}
      </p>
      {r.stockConditional && (
        <p className="helper">
          Kebutuhan dihitung dengan biaya stok terbuang pada volume saat ini.
          Uji kelayakan juga menjalankan model stok pada permintaan kapasitas
          penuh; kebutuhan dapat berubah bila pola pembelian atau pemborosan
          berubah.
        </p>
      )}
    </Card>
  );
}
export function StressPanel({
  b,
  s,
  readOnly = false,
}: {
  b: Business;
  s: Scenario;
  readOnly?: boolean;
}) {
  const { data, commit } = useStore();
  const results = stressTest(b, s, data.stress);
  return (
    <Card>
      <SectionTitle
        title="Bagaimana jika permintaan berubah?"
        sub="Uji sensitivitas hipotetis · bukan probabilitas statistik"
      />
      <div className="stress-grid">
        {results.map((x, i) => (
          <div key={x.name}>
            <span className="eyebrow">{x.name}</span>
            {readOnly ? (
              <p>{x.change}%</p>
            ) : (
              <NumericField
                label={`Perubahan ${x.name.toLowerCase()}`}
                unit="%"
                min={-100}
                max={1000}
                value={data.stress[i]}
                onChange={(n) => {
                  const next = [...data.stress] as [number, number, number];
                  next[i] = n;
                  commit({ ...data, stress: next });
                }}
              />
            )}
            <strong>{rupiah(x.result.profit)}</strong>
            <small>laba operasional / bulan</small>
          </div>
        ))}
      </div>
      <ComparisonChart
        data={results.map((x) => ({ name: x.name, ...x.result }))}
      />
      <p className="helper">
        Perubahan diterapkan secara relatif terhadap permintaan skenario
        terpilih. Harga, biaya, dan kapasitas tetap sama.
      </p>
    </Card>
  );
}
