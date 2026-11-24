import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  GitBranch,
  ClipboardCheck,
  Wallet,
  Target,
} from "lucide-react";
import type { Business, Scenario } from "../../types";
import { Card } from "../common";
import { Button } from "../ui/button";
import { NumericField } from "../simulator/ScenarioFields";
import { decisionAnalysis, startDecision } from "../../lib/planning/decision";
import { cashProjection } from "../../lib/planning/cash";
import { useStore } from "../../lib/storage";
import { number, rupiah, percent } from "../../lib/formatters";
import { today, shiftDate } from "../../lib/forecast";
import { decisionSchema } from "../../lib/validation";
export function DecisionPanels({
  b,
  s,
  onChange,
}: {
  b: Business;
  s: Scenario;
  onChange: (s: Scenario) => void;
}) {
  const d = decisionAnalysis(b, s),
    p = s.plan,
    cash = cashProjection(b, s),
    { data, commit, notify } = useStore();
  const [starting, setStarting] = useState(false),
    [start, setStart] = useState(today()),
    [end, setEnd] = useState(shiftDate(today(), 29)),
    [error, setError] = useState("");
  return (
    <div className="decision-panels">
      <Card className="safe-card">
        <div className="panel-icon-title">
          <ShieldCheck size={20} />
          <h2>Batas aman keputusan</h2>
        </div>
        {d.safe.required === null ? (
          <p>
            Harga belum menutup biaya per pesanan. Perbaiki harga atau biaya
            sebelum menambah penjualan.
          </p>
        ) : (
          <>
            <strong>
              {number(d.safe.required)} <small>pesanan / bulan</small>
            </strong>
            <p>
              Minimal untuk mempertahankan keuntungan awal{" "}
              {rupiah(d.base.profit)}.
            </p>
            <span
              className={`badge ${!d.safe.feasible ? "badge-warning" : ""}`}
            >
              {d.safe.feasible
                ? "Terjangkau oleh kapasitas saat ini"
                : "Belum terjangkau oleh kapasitas / stok"}
            </span>
            {d.safeDecline !== null && d.safeDecline > 0 && (
              <p className="helper">
                Setara penurunan sekitar {percent(d.safeDecline)} dari jumlah
                pesanan awal.
              </p>
            )}
          </>
        )}
        {d.base.profit < 0 && (
          <p className="warning">
            Kondisi awal masih rugi. Batas ini menyamai hasil awal; gunakan
            analisis target untuk mencari keuntungan positif.
          </p>
        )}
        <p className="helper">
          Batas hitungan bersyarat; belum memprediksi respons pelanggan.{" "}
          {p.stockEnabled
            ? "Target perlu diuji kembali bila kebijakan stok berubah."
            : ""}
        </p>
      </Card>
      <details className="simple-details">
        <summary>
          <GitBranch size={16} />
          Mengapa hasilnya berubah?
        </summary>
        <div className="panel-body">
          {d.bridge.map((x) => (
            <div className="explanation-row" key={x.name}>
              <span>{x.name}</span>
              <b>
                {x.value > 0 ? "+" : ""}
                {rupiah(x.value)}
              </b>
            </div>
          ))}
          <div className="explanation-row total">
            <span>Total perubahan keuntungan</span>
            <b>{rupiah(d.result.profit - d.base.profit)}</b>
          </div>
          {d.constraints.map((c) => (
            <p className="warning" key={c}>
              {c}
            </p>
          ))}
        </div>
      </details>
      <details className="simple-details">
        <summary>
          <Target size={16} />
          Pilihan lain & langkah uji
        </summary>
        <div className="panel-body">
          <p className="helper">
            Alternatif berikut mengubah asumsi biaya dan kapasitas secara
            eksplisit; bukan estimasi harga tenaga kerja atau prediksi
            penjualan.
          </p>
          {d.variants.map((v, i) => (
            <div className="alternative-row" key={v.name}>
              <div>
                <b>{v.name}</b>
                <p>
                  {rupiah(v.result.profit)} / bulan · modal{" "}
                  {rupiah(v.s.plan.investment)}
                </p>
              </div>
              {i > 0 && (
                <Button
                  variant="outline"
                  onClick={() => onChange({ ...v.s, id: s.id, name: s.name })}
                >
                  Coba
                </Button>
              )}
            </div>
          ))}
          <p className="next-action">{d.testAction}</p>
        </div>
      </details>
      <details className="simple-details">
        <summary>
          <Wallet size={16} />
          Perjalanan kas, modal & stok
        </summary>
        <div className="panel-body">
          <p className="helper">
            Bulan model = 30 hari, pemasukan dan biaya rutin tersebar merata.
            Saldo awal dan stok awal dianggap sudah tersedia / dibayar.
            Kebutuhan kas aktual mengikuti jadwal pembayaran bisnis.
          </p>
          <div className="form-grid">
            <NumericField
              label="Saldo kas awal"
              unit="Rp"
              value={p.cash}
              onChange={(cash) => onChange({ ...s, plan: { ...p, cash } })}
            />
            <NumericField
              label="Cadangan kas minimum"
              unit="Rp"
              value={p.buffer}
              onChange={(buffer) => onChange({ ...s, plan: { ...p, buffer } })}
            />
            <NumericField
              label="Pembayaran pelanggan setelah"
              unit="hari"
              max={90}
              value={p.receiveDays}
              onChange={(receiveDays) =>
                onChange({
                  ...s,
                  plan: { ...p, receiveDays: Math.floor(receiveDays) },
                })
              }
            />
            <NumericField
              label="Pembayaran biaya variabel setelah"
              unit="hari"
              max={90}
              value={p.payDays}
              onChange={(payDays) =>
                onChange({ ...s, plan: { ...p, payDays: Math.floor(payDays) } })
              }
            />
            <NumericField
              label="Periode proyeksi"
              unit="bulan"
              min={1}
              max={12}
              value={p.months}
              onChange={(months) =>
                onChange({ ...s, plan: { ...p, months: Math.floor(months) } })
              }
            />
          </div>
          {p.stockEnabled && (
            <div className="stock-guidance">
              <p className="helper">
                Dengan konsumsi merata, titik pesan ulang yang menutup waktu
                tunggu sekitar{" "}
                {Math.ceil(
                  ((d.result.orders + d.result.stockLost) / 30) * p.leadDays,
                )}{" "}
                unit. Tambahkan cadangan bila permintaan tidak pasti.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  onChange({
                    ...s,
                    plan: {
                      ...p,
                      reorderPoint: Math.ceil(
                        ((d.result.orders + d.result.stockLost) / 30) *
                          p.leadDays,
                      ),
                    },
                  })
                }
              >
                Gunakan titik pesan ulang ini
              </Button>
            </div>
          )}
          <details className="small-details">
            <summary>Piutang & tagihan yang sudah ada</summary>
            <div className="form-grid">
              <NumericField
                label="Piutang awal belum diterima"
                unit="Rp"
                value={p.openingReceivables}
                onChange={(openingReceivables) =>
                  onChange({ ...s, plan: { ...p, openingReceivables } })
                }
              />
              <NumericField
                label="Piutang awal diterima setelah"
                unit="hari"
                max={90}
                value={p.receivableDue}
                onChange={(receivableDue) =>
                  onChange({
                    ...s,
                    plan: { ...p, receivableDue: Math.floor(receivableDue) },
                  })
                }
              />
              <NumericField
                label="Tagihan awal belum dibayar"
                unit="Rp"
                value={p.openingPayables}
                onChange={(openingPayables) =>
                  onChange({ ...s, plan: { ...p, openingPayables } })
                }
              />
              <NumericField
                label="Tagihan awal dibayar setelah"
                unit="hari"
                max={90}
                value={p.payableDue}
                onChange={(payableDue) =>
                  onChange({
                    ...s,
                    plan: { ...p, payableDue: Math.floor(payableDue) },
                  })
                }
              />
            </div>
            <p className="helper">
              Saldo piutang dan tagihan lama memengaruhi kas, tidak dihitung
              lagi sebagai pendapatan atau biaya periode ini.
            </p>
          </details>
          <div className="cash-summary">
            <span>
              Kas terendah<b>{rupiah(cash.minCash)}</b>
            </span>
            <span>
              Tambahan untuk menjaga cadangan
              <b>{rupiah(cash.additionalBuffer)}</b>
            </span>
          </div>
          {cash.firstNegative !== null && (
            <p className="warning">
              Kas menjadi negatif pada hari model ke-{cash.firstNegative}.
              Tinjau modal atau waktu pembayaran.
            </p>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Keuntungan</th>
                  <th>Saldo kas akhir</th>
                  {p.stockEnabled && (
                    <>
                      <th>Stok hilang / terbuang</th>
                      <th>Stok akhir</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {cash.periods.map((x) => (
                  <tr key={x.month}>
                    <td>Bulan {x.month}</td>
                    <td>{rupiah(x.result.profit)}</td>
                    <td>{rupiah(x.cash)}</td>
                    {p.stockEnabled && (
                      <>
                        <td>
                          {number(x.result.stockLost)} /{" "}
                          {number(x.result.stockWaste)}
                        </td>
                        <td>{number(x.result.stockClosing)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="helper">
            Di luar periode: piutang {rupiah(cash.receivables)} · utang biaya
            variabel {rupiah(cash.payables)}. Keduanya belum menjadi penerimaan
            / pembayaran kas.
          </p>
          {p.investment > 0 && (
            <p className="helper">
              Modal awal {rupiah(p.investment)} dibayar di awal dan terpisah
              dari laba operasional.{" "}
              {d.result.profit > d.base.profit
                ? `Balik modal sederhana ≈ ${number(p.investment / (d.result.profit - d.base.profit))} bulan, jika tambahan keuntungan tetap.`
                : "Tambahan keuntungan belum positif; balik modal belum tercapai dalam asumsi ini."}
            </p>
          )}
        </div>
      </details>
      <Card className="test-decision">
        <div className="panel-icon-title">
          <ClipboardCheck size={20} />
          <h2>Jalankan sebagai uji keputusan</h2>
        </div>
        <p>
          Pantau hasil nyata dan bandingkan dengan rencana ini. Kondisi bisnis
          saat mulai akan disimpan sebagai acuan.
        </p>
        {!starting ? (
          <Button variant="outline" onClick={() => setStarting(true)}>
            Mulai uji keputusan
          </Button>
        ) : (
          <>
            <div className="form-grid">
              <label className="field">
                <span>Tanggal mulai</span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Tanggal akhir</span>
                <input
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="inline-actions">
              <Button
                onClick={() => {
                  if (
                    !start ||
                    !end ||
                    end < start ||
                    Date.parse(end) - Date.parse(start) >= 365 * 86400000
                  ) {
                    setError(
                      "Pilih rentang tanggal yang valid, maksimal 365 hari.",
                    );
                    return;
                  }
                  const decision = startDecision(b, s, start, end);
                  const valid = decisionSchema.safeParse(decision);
                  if (!valid.success) {
                    setError(valid.error.issues[0].message);
                    return;
                  }
                  if (
                    !commit({
                      ...data,
                      decisions: [decision, ...data.decisions],
                    })
                  )
                    return;
                  notify("Uji keputusan dimulai. Kondisi awal sudah disimpan.");
                  setStarting(false);
                }}
              >
                Simpan & mulai uji
              </Button>
              <Button variant="outline" onClick={() => setStarting(false)}>
                Batal
              </Button>
              <Link className="text-link" to="/decisions">
                Lihat evaluasi
              </Link>
            </div>
            <p className="helper">
              Hasil bulanan dinormalisasi ke periode uji dengan basis 30 hari.
              Catat semua biaya periode yang sama saat evaluasi.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
