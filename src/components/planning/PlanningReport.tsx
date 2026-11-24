import type { Business, Scenario } from "../../types";
import { Card, SectionTitle } from "../common";
import { decisionAnalysis } from "../../lib/planning/decision";
import { cashProjection } from "../../lib/planning/cash";
import { rupiah, number } from "../../lib/formatters";
import { useStore } from "../../lib/storage";
export function PlanningReport({ b, s }: { b: Business; s: Scenario }) {
  const d = decisionAnalysis(b, s),
    c = cashProjection(b, s),
    p = s.plan;
  const decisions = useStore((x) => x.data.decisions);
  const completed = decisions.filter(
    (v) => v.scenario.id === s.id && v.status === "completed",
  );
  return (
    <>
      <Card>
        <SectionTitle title="Batas aman & penyebab perubahan" />
        <p>
          Minimal pesanan untuk menjaga keuntungan awal:{" "}
          <b>
            {d.safe.required === null
              ? "Belum tercapai"
              : number(d.safe.required)}
          </b>{" "}
          / bulan.{" "}
          {d.safe.feasible
            ? "Kapasitas model memadai."
            : "Kapasitas atau stok belum memadai."}
        </p>
        {d.bridge.map((x) => (
          <div className="explanation-row" key={x.name}>
            <span>{x.name}</span>
            <b>{rupiah(x.value)}</b>
          </div>
        ))}
        <p className="helper">{d.testAction}</p>
      </Card>
      <Card>
        <SectionTitle title="Asumsi operasional tambahan" />
        <p className="helper">
          Jenis: {p.kind}. Perubahan hari {p.extraDays}; kapasitas{" "}
          {number(p.capacityChange)} / hari; biaya rutin {rupiah(p.extraFixed)}{" "}
          / bulan; modal awal {rupiah(p.investment)}; hemat biaya{" "}
          {rupiah(p.unitSavings)} / pesanan; bagian kanal {p.channelShare}%;
          komisi {p.commission}%; kemasan rata-rata {rupiah(p.packaging)}.
        </p>
        <p className="helper">
          Tambahan jam buka {p.extraHours} / hari × {p.ordersPerHour} pesanan /
          jam; biaya {rupiah(p.costPerHour)} / jam. Paket berisi {p.bundleUnits}{" "}
          produk; harga paket{" "}
          {p.bundlePrice > 0
            ? rupiah(p.bundlePrice)
            : "mengikuti harga normal × isi"}
          ; bagian promo {p.promoShare}%; subsidi ongkir{" "}
          {rupiah(p.shippingSubsidy)} / pesanan promo.
        </p>
        {p.marketingModel === "funnel" && (
          <p className="helper">
            Funnel asumsi pengguna: {p.visitors} pengunjung / bulan; konversi{" "}
            {p.conversion}%; pembelian ulang satu kali {p.repeat}%. Tidak
            mengestimasi respons pasar secara otomatis.
          </p>
        )}
        {p.products.length > 0 && (
          <p className="helper">
            Campuran:{" "}
            {p.products
              .map(
                (x) =>
                  `${x.name} (harga ${rupiah(x.price)}, biaya ${rupiah(x.cost)}, bobot ${x.weight})`,
              )
              .join("; ")}
            . Model rata-rata tertimbang, kapasitas bersama.
          </p>
        )}
        {p.stockEnabled && (
          <p className="helper">
            Stok awal {p.initialStock}; titik pesan ulang {p.reorderPoint}; beli{" "}
            {p.orderQuantity} unit; tunggu {p.leadDays} hari; masa simpan{" "}
            {p.shelfDays} hari. Satu unit stok setara satu pesanan.
          </p>
        )}
        <p className="helper">
          Permintaan: {p.forecastNote || "Asumsi pengguna."}
        </p>
      </Card>
      <Card>
        <SectionTitle
          title="Perjalanan kas & kebutuhan modal"
          sub="Bulan model 30 hari, beban dan penjualan tersebar merata; bukan jadwal pembayaran aktual."
        />
        <p className="helper">
          Saldo awal {rupiah(p.cash)}; cadangan {rupiah(p.buffer)}; pelanggan
          membayar setelah {p.receiveDays} hari; biaya variabel dibayar setelah{" "}
          {p.payDays} hari. Stok awal dianggap sudah dibayar.
        </p>
        <p className="helper">
          Piutang awal {rupiah(p.openingReceivables)} diterima setelah{" "}
          {p.receivableDue} hari; tagihan awal {rupiah(p.openingPayables)}{" "}
          dibayar setelah {p.payableDue} hari. Saldo lama hanya memengaruhi kas.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Periode</th>
                <th>Keuntungan</th>
                <th>Kas akhir</th>
                <th>Pesanan hilang / stok terbuang</th>
              </tr>
            </thead>
            <tbody>
              {c.periods.map((x) => (
                <tr key={x.month}>
                  <td>Bulan {x.month}</td>
                  <td>{rupiah(x.result.profit)}</td>
                  <td>{rupiah(x.cash)}</td>
                  <td>
                    {number(x.result.stockLost)} / {number(x.result.stockWaste)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="helper">
          Kas terendah {rupiah(c.minCash)}. Tambahan untuk menjaga cadangan{" "}
          {rupiah(c.additionalBuffer)}. Piutang akhir {rupiah(c.receivables)};
          utang biaya variabel akhir {rupiah(c.payables)}.
        </p>
      </Card>
      {completed.length > 0 && (
        <Card>
          <SectionTitle
            title="Evaluasi hasil nyata"
            sub="Setiap evaluasi menggunakan kondisi awal yang dibekukan saat uji dimulai."
          />
          {completed.map((x) => (
            <p className="helper" key={x.id}>
              {x.start}—{x.end}: perkiraan {rupiah(x.expectedProfit)}; hasil
              aktual{" "}
              {rupiah(
                (x.actualRevenue ?? 0) -
                  (x.actualVariable ?? 0) -
                  (x.actualFixed ?? 0),
              )}
              . {x.note}
            </p>
          ))}
        </Card>
      )}
    </>
  );
}
