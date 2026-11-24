import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tag, Megaphone, Users, RotateCcw, Save } from "lucide-react";
import { Card, ComparisonTable, ComparisonChart } from "../components/common";
import { Button } from "../components/ui/button";
import {
  NumericField,
  ScenarioFields,
} from "../components/simulator/ScenarioFields";
import { useStore, download } from "../lib/storage";
import { baseline, preset } from "../data/demo";
import { simulate, insights } from "../lib/simulation";
import { scenarioSchema } from "../lib/validation";
import { rupiah, number } from "../lib/formatters";
import type { Scenario } from "../types";
import {
  extraChoices,
  OperationFields,
  CombinedOperations,
} from "../components/planning/OperationFields";
import { DecisionPanels } from "../components/planning/DecisionPanels";
import { forecast } from "../lib/forecast";
const kindIndex = (s: Scenario) => {
  const i = extraChoices.findIndex((x) => x.kind === s.plan.kind);
  return i >= 0
    ? i + 3
    : s.employees > 0
      ? 2
      : s.discount > 0 || s.marketing > 0
        ? 1
        : 0;
};
const choices = [
  { title: "Ubah harga", icon: Tag },
  { title: "Beri diskon", icon: Megaphone },
  { title: "Tambah karyawan", icon: Users },
];
export default function Simulator() {
  const [params, setParams] = useSearchParams();
  const { data, saveScenario, notify } = useStore();
  const b = data.business;
  const saved = data.scenarios.find((s) => s.id === params.get("id"));
  const [type, setType] = useState(() =>
    saved
      ? kindIndex(saved)
      : Math.max(0, Math.min(10, Number(params.get("template")) || 0)),
  );
  const [s, setS] = useState<Scenario>(
    () =>
      saved ??
      (params.has("template")
        ? {
            ...preset(b, type),
            name:
              type >= 3 ? extraChoices[type - 3].title : preset(b, type).name,
            plan: {
              ...baseline(b).plan,
              kind: type >= 3 ? extraChoices[type - 3].kind : "basic",
              stockEnabled: type === 5,
            },
          }
        : { ...baseline(b), id: crypto.randomUUID(), name: "Simulasi harga" }),
  );
  const [error, setError] = useState("");
  const title = type < 3 ? choices[type].title : extraChoices[type - 3].title;
  const f = forecast(data.history, 30);
  const [forecastApplied, setForecastApplied] = useState(false);
  function applyForecast() {
    if (!f.available) return;
    const change =
      b.demand > 0 ? (f.total / (b.demand * b.days) - 1) * 100 : NaN;
    if (!Number.isFinite(change) || change > 1000) {
      setError(
        "Perbarui permintaan awal bisnis agar lebih dari nol dan sesuai skala riwayat.",
      );
      return;
    }
    setS({
      ...s,
      demandChange: Math.max(-100, change),
      plan: {
        ...s.plan,
        demandSource: "history",
        forecastNote: `${data.history.some(row=>row.note.includes('CONTOH FIKTIF'))?'CONTOH FIKTIF. ':''}${f.method}; ${f.usable} catatan, galat harian ${number(f.mae)}, catatan terakhir ${f.last}. Perkiraan 30 hari: ${f.total} pesanan. Dinormalisasi ke ${b.days} hari operasi.`,
      },
    });
    setForecastApplied(true);
    notify(
      "Perkiraan riwayat dipakai sebagai asumsi permintaan; efek keputusan tetap diisi terpisah.",
    );
  }
  function choose(i: number) {
    const next = baseline(b);
    setType(i);
    setS({
      ...next,
      id: crypto.randomUUID(),
      name: i < 3 ? choices[i].title : extraChoices[i - 3].title,
      plan: {
        ...next.plan,
        kind: i >= 3 ? extraChoices[i - 3].kind : "basic",
        stockEnabled: i === 5,
      },
    });
    setParams({ template: String(i) }, { replace: true });
    setError("");
    setForecastApplied(false);
  }
  const update = (key: keyof Scenario, value: number) =>
    setS({ ...s, [key]: value });
  const r = simulate(b, s),
    base = simulate(b),
    delta = r.profit - base.profit;
  function save() {
    const next = {
      ...s,
      name: s.name.trim() || title,
      updatedAt: new Date().toISOString(),
    };
    const result = scenarioSchema.safeParse(next);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return false;
    }
    setS(next);
    if (!saveScenario(next)) return false;
    setParams({ id: next.id }, { replace: true });
    setError("");
    return true;
  }
  return (
    <div className="simple-simulator">
      <div className="simple-heading">
        <span className="eyebrow">
          SIMULASI {b.demo && <span className="badge">Data Demo</span>}
        </span>
        <h1>Coba satu perubahan.</h1>
        <p>Pahami kemungkinan hasil, batas aman, dan langkah berikutnya.</p>
      </div>
      <div className="simple-tabs" role="group" aria-label="Jenis simulasi">
        {choices.map((choice, i) => (
          <button
            key={choice.title}
            aria-pressed={type === i}
            onClick={() => choose(i)}
          >
            <choice.icon size={18} />
            {choice.title}
          </button>
        ))}
      </div>
      <details className="more-decisions" open={type >= 3}>
        <summary>
          Keputusan bisnis lainnya{type >= 3 ? ` · ${title}` : ""}
        </summary>
        <div className="extra-decisions">
          {extraChoices.map((x, i) => (
            <button
              key={x.kind}
              aria-pressed={type === i + 3}
              onClick={() => choose(i + 3)}
            >
              <x.icon size={18} />
              {x.title}
            </button>
          ))}
        </div>
      </details>
      {params.has("forecast") && !forecastApplied && f.available && (
        <div className="forecast-apply">
          <span>
            Gunakan perkiraan {number(f.total)} pesanan untuk 30 hari dari
            riwayat Anda?
          </span>
          <Button variant="outline" onClick={applyForecast}>
            Terapkan perkiraan riwayat
          </Button>
        </div>
      )}
      <div className="simple-calculator">
        <Card className="simple-inputs">
          <div className="section-title">
            <h2>{title}</h2>
            <button
              className="icon-btn"
              aria-label="Reset asumsi"
              onClick={() => {
                setS({ ...baseline(b), id: s.id, name: s.name });
                notify("Asumsi dikembalikan ke kondisi awal.");
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <p className="input-context">
            Saat ini: {rupiah(b.price)} / pesanan · {number(b.demand)} pesanan /
            hari
          </p>
          {type === 0 && (
            <NumericField
              label="Harga naik / turun"
              unit="%"
              min={-100}
              max={1000}
              value={s.priceChange}
              onChange={(n) => update("priceChange", n)}
              help={`Harga setelah perubahan: ${rupiah(r.price)} per pesanan.`}
            />
          )}
          {type === 1 && (
            <>
              <NumericField
                label="Diskon"
                unit="%"
                max={100}
                value={s.discount}
                onChange={(n) => update("discount", n)}
                help={`Berlaku pada ${s.plan.promoShare}% pesanan dalam simulasi.`}
              />
              <NumericField
                label="Biaya promosi / bulan"
                unit="Rp"
                value={s.marketing}
                onChange={(n) => update("marketing", n)}
              />
              <details className="small-details">
                <summary>Voucher, paket & subsidi ongkir</summary>
                <NumericField
                  label="Bagian pesanan yang mendapat promo"
                  unit="%"
                  max={100}
                  value={s.plan.promoShare}
                  onChange={(promoShare) =>
                    setS({ ...s, plan: { ...s.plan, promoShare } })
                  }
                />
                <NumericField
                  label="Isi produk per paket"
                  unit="unit"
                  min={1}
                  max={20}
                  value={s.plan.bundleUnits}
                  onChange={(bundleUnits) =>
                    setS({
                      ...s,
                      plan: { ...s.plan, bundleUnits: Math.floor(bundleUnits) },
                    })
                  }
                />
                <NumericField
                  label="Harga paket sebelum diskon (0 = harga normal × isi)"
                  unit="Rp"
                  value={s.plan.bundlePrice}
                  onChange={(bundlePrice) =>
                    setS({ ...s, plan: { ...s.plan, bundlePrice } })
                  }
                />
                <NumericField
                  label="Subsidi ongkir per pesanan promo"
                  unit="Rp"
                  value={s.plan.shippingSubsidy}
                  onChange={(shippingSubsidy) =>
                    setS({ ...s, plan: { ...s.plan, shippingSubsidy } })
                  }
                />
                <p className="helper">
                  Harga dan biaya dihitung per paket / pesanan. Promo sebagian
                  menggunakan nilai rata-rata tertimbang, bukan pembagian
                  transaksi individual.
                </p>
              </details>
            </>
          )}
          {type === 2 && (
            <>
              <NumericField
                label="Karyawan tambahan"
                unit="orang"
                max={1000}
                value={s.employees}
                onChange={(n) => update("employees", Math.floor(n))}
              />
              <NumericField
                label="Gaji per orang / bulan"
                unit="Rp"
                value={s.salary}
                onChange={(n) => update("salary", n)}
              />
              <NumericField
                label="Tambahan pesanan yang bisa dilayani per orang / hari"
                value={s.addedCapacity}
                max={1e6}
                onChange={(n) => update("addedCapacity", n)}
              />
            </>
          )}
          {type >= 3 && <OperationFields s={s} onChange={setS} />}
          <NumericField
            label={
              s.plan.marketingModel === "funnel"
                ? "Pelanggan lama bertambah / berkurang"
                : "Pelanggan bertambah / berkurang"
            }
            unit="%"
            min={-100}
            max={1000}
            value={s.demandChange}
            onChange={(n) => update("demandChange", n)}
            help={`Perkiraan Anda: ${number(r.demand)} pesanan per hari. Isi 0 jika tetap sama.`}
          />
          {s.plan.forecastNote && (
            <p className="helper source-note">
              Dasar awal dari riwayat: {s.plan.forecastNote} Perubahan keputusan
              dapat Anda sesuaikan.
            </p>
          )}
          {!params.has("forecast") && f.available && (
            <Button variant="ghost" onClick={applyForecast}>
              Ambil perkiraan dari riwayat
            </Button>
          )}
          <Link className="text-link subtle-link" to="/settings">
            Ubah data awal bisnis
          </Link>
        </Card>
        <Card className="simple-result">
          <span className="eyebrow">PERKIRAAN KEUNTUNGAN / BULAN</span>
          <strong className="result-amount">{rupiah(r.profit)}</strong>
          <div className="profit-before">Sebelumnya {rupiah(base.profit)}</div>
          <div className={`result-delta ${delta < 0 ? "result-down" : ""}`}>
            {delta === 0
              ? "Sama dengan kondisi saat ini"
              : `${delta > 0 ? "Bertambah" : "Berkurang"} ${rupiah(Math.abs(delta))} / bulan`}
          </div>
          <p className="result-summary">{insights(b, s)[0]}</p>
          {r.unserved > 0 && (
            <p className="result-warning">
              {number(r.unserved)} pesanan per hari belum bisa dilayani karena
              kapasitas penuh.
            </p>
          )}
          {r.contribution <= 0 && (
            <p className="result-warning">
              Harga jual belum menutup biaya per pesanan. Menambah penjualan
              tidak meningkatkan keuntungan.
            </p>
          )}
          {r.stockLost > 0 && (
            <p className="result-warning">
              {number(r.stockLost)} pesanan tidak terpenuhi karena stok habis.{" "}
              {number(r.stockWaste)} unit stok terbuang.
            </p>
          )}
          <div className="result-small-stats">
            <span>
              Omzet / bulan<b>{rupiah(r.revenue)}</b>
            </span>
            <span>
              Pesanan / bulan<b>{number(r.orders)}</b>
            </span>
          </div>
          <div className="simple-save">
            <label className="field">
              <span>Nama simulasi</span>
              <input
                value={s.name}
                maxLength={100}
                onChange={(e) => setS({ ...s, name: e.target.value })}
              />
            </label>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button onClick={save}>
              <Save size={15} />
              Simpan simulasi
            </Button>
          </div>
        </Card>
      </div>
      <DecisionPanels b={b} s={s} onChange={setS} />
      <details className="simple-details">
        <summary>Lihat rincian & pengaturan tambahan</summary>
        <div className="advanced-grid">
          <Card>
            <h2>Asumsi lengkap</h2>
            <ScenarioFields s={s} onChange={setS} />
            <CombinedOperations s={s} onChange={setS} />
          </Card>
          <div>
            <Card>
              <h2>Perbandingan lengkap</h2>
              <ComparisonChart
                data={[
                  { name: "Sebelumnya", ...base },
                  { name: "Setelah perubahan", ...r },
                ]}
              />
              <ComparisonTable b={b} scenarios={[s]} />
            </Card>
            <div className="inline-actions advanced-links">
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    "whatif-skenario.json",
                    JSON.stringify(
                      { version: 1, business: b, scenario: s, result: r },
                      null,
                      2,
                    ),
                  )
                }
              >
                Ekspor skenario JSON
              </Button>
              <Button asChild variant="outline">
                <Link
                  to={`/insights?id=${s.id}`}
                  onClick={(e) => {
                    if (!save()) e.preventDefault();
                  }}
                >
                  Analisis target & risiko
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  to={`/reports?id=${s.id}`}
                  onClick={(e) => {
                    if (!save()) e.preventDefault();
                  }}
                >
                  Buka laporan
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </details>
      <p className="simple-disclaimer">
        Perkiraan dari input Anda, bukan jaminan hasil. Gaji lama sudah termasuk
        biaya tetap.
      </p>
    </div>
  );
}
