import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Trash2, Pencil, Layers, ClipboardCheck } from "lucide-react";
import { recommendation } from "../lib/planning/decision";
import { PageHead } from "../components/layout/Shell";
import {
  Card,
  SectionTitle,
  ComparisonChart,
  ComparisonTable,
} from "../components/common";
import { Button } from "../components/ui/button";
import { useStore } from "../lib/storage";
import { simulate } from "../lib/simulation";
import { rupiah, percent } from "../lib/formatters";
export default function Scenarios() {
  const { data, saveScenario, remove, notify } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const b = data.business;
  const chosen = data.scenarios.filter((s) => selected.includes(s.id));
  const base = simulate(b);
  const [goal, setGoal] = useState<
    "profit" | "cash" | "capacity" | "resilient"
  >("profit");
  const ranked = recommendation(b, chosen, goal);
  return (
    <>
      <PageHead
        title="Simulasi tersimpan"
        sub="Buka lagi ide Anda, atau pilih beberapa untuk dibandingkan."
      />
      <div className="journey-link">
        <Link to="/decisions">
          <ClipboardCheck size={17} />
          Lihat uji keputusan & hasil nyata ({data.decisions.length})
        </Link>
      </div>
      <div className="section-title">
        <span className="helper">
          {data.scenarios.length} skenario tersimpan di browser ini
        </span>
        <span className="badge">Pilih hingga 3 untuk dibandingkan</span>
      </div>
      {!data.scenarios.length ? (
        <Card className="empty large">
          <Layers size={36} />
          <h2>Semua kemungkinan dimulai di sini.</h2>
          <p>
            Buat skenario pertama untuk membandingkan dampaknya pada bisnis
            Anda.
          </p>
          <Button asChild>
            <Link to="/simulator">Buat simulasi pertama</Link>
          </Button>
        </Card>
      ) : (
        <div className="scenario-grid">
          {data.scenarios.map((s) => {
            const r = simulate(b, s);
            return (
              <Card
                key={s.id}
                className={
                  selected.includes(s.id)
                    ? "scenario-card selected"
                    : "scenario-card"
                }
              >
                <div className="scenario-card-top">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked && selected.length >= 3) {
                          notify("Maksimal tiga skenario dapat dibandingkan.");
                          return;
                        }
                        setSelected(
                          e.target.checked
                            ? [...selected, s.id]
                            : selected.filter((x) => x !== s.id),
                        );
                      }}
                    />
                    Bandingkan
                  </label>
                  <span className="badge">Skenario</span>
                </div>
                <h2>{s.name}</h2>
                <small>
                  Diperbarui {new Date(s.updatedAt).toLocaleDateString("id-ID")}
                </small>
                <div className="scenario-profit">
                  <span>Laba operasional / bulan</span>
                  <strong>{rupiah(r.profit)}</strong>
                  <span>
                    {r.profit - base.profit >= 0 ? "+" : ""}
                    {rupiah(r.profit - base.profit)} dari awal
                  </span>
                </div>
                <div className="scenario-stats">
                  <span>
                    Omzet<b>{rupiah(r.revenue)}</b>
                  </span>
                  <span>
                    Margin<b>{percent(r.margin)}</b>
                  </span>
                </div>
                <div className="scenario-actions">
                  <Button asChild variant="outline">
                    <Link to={`/simulator?id=${s.id}`}>
                      <Pencil size={14} />
                      Edit
                    </Link>
                  </Button>
                  <button
                    className="icon-btn"
                    aria-label={`Duplikat ${s.name}`}
                    onClick={() =>
                      saveScenario({
                        ...s,
                        id: crypto.randomUUID(),
                        name: `${s.name.slice(0, 90)} (salinan)`,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <Copy size={17} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Hapus ${s.name}`}
                    onClick={() => setDeleting(s.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {chosen.length > 0 && (
        <div className="comparison-area">
          <Card className="recommendation">
            <label className="field">
              <span>Tujuan perbandingan</span>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as typeof goal)}
              >
                <option value="profit">Keuntungan tertinggi</option>
                <option value="cash">Menjaga saldo kas</option>
                <option value="capacity">
                  Paling sedikit pelanggan tak terlayani
                </option>
                <option value="resilient">
                  Lebih tahan permintaan turun 20%
                </option>
              </select>
            </label>
            {ranked[0] && (
              <p>
                Di antara pilihan ini, <b>{ranked[0].s.name}</b> paling sesuai
                dengan tujuan yang dipilih. {ranked[0].reason}
              </p>
            )}
            <p className="helper">
              Urutan berdasarkan asumsi yang sama; periksa kebutuhan kas,
              risiko, dan kesiapan operasional sebelum menjalankan.
            </p>
          </Card>
          <Card>
            <SectionTitle
              title="Perbandingan keputusan"
              sub="Semua skenario memakai profil bisnis saat ini sebagai acuan."
            />
            <ComparisonChart
              data={[
                { name: "Kondisi awal", ...base },
                ...chosen.map((s) => ({ name: s.name, ...simulate(b, s) })),
              ]}
            />
            <ComparisonTable b={b} scenarios={chosen} />
          </Card>
          <p className="helper">
            Selisih laba sudah memperhitungkan diskon, pemasaran, gaji tambahan,
            dan batas kapasitas. Hasil dapat berubah saat profil bisnis
            diperbarui.
          </p>
        </div>
      )}
      {deleting && (
        <div className="modal-backdrop">
          <section
            className="confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <Trash2 size={25} />
            <h2 id="delete-title">Hapus skenario ini?</h2>
            <p>
              “{data.scenarios.find((s) => s.id === deleting)?.name}” akan
              dihapus dari browser ini. Ekspor cadangan untuk menyimpan salinan.
            </p>
            <div className="inline-actions">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  remove(deleting);
                  setSelected(selected.filter((id) => id !== deleting));
                  setDeleting(null);
                  notify("Skenario dihapus.");
                }}
              >
                Hapus skenario
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
