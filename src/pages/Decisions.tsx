import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Trash2 } from "lucide-react";
import { PageHead } from "../components/layout/Shell";
import { Card, SectionTitle } from "../components/common";
import { Button } from "../components/ui/button";
import { NumericField } from "../components/simulator/ScenarioFields";
import { useStore } from "../lib/storage";
import { decisionSchema } from "../lib/validation";
import type { Decision } from "../types";
import { rupiah, number } from "../lib/formatters";
import { simulate } from "../lib/simulation";
import { baseline } from "../data/demo";
import { useNavigate } from "react-router-dom";
function Evaluation({ d }: { d: Decision }) {
  const navigate = useNavigate();
  const { data, commit, notify, saveScenario } = useStore();
  const [orders, setOrders] = useState(d.actualOrders ?? d.expectedOrders),
    [revenue, setRevenue] = useState(d.actualRevenue ?? 0),
    [variable, setVariable] = useState(d.actualVariable ?? 0),
    [fixed, setFixed] = useState(d.actualFixed ?? 0),
    [note, setNote] = useState(d.note),
    [error, setError] = useState("");
  const actual =
    (d.actualRevenue ?? 0) - (d.actualVariable ?? 0) - (d.actualFixed ?? 0);
  const [editing, setEditing] = useState(d.status === "running");
  const r = simulate(d.business, d.scenario);
  const days =
    Math.round((Date.parse(d.end) - Date.parse(d.start)) / 86400000) + 1;
  const actualMeanPrice = orders > 0 ? revenue / orders : 0;
  return (
    <Card className="evaluation-card">
      <SectionTitle
        title={d.scenario.name}
        sub={`${d.start} — ${d.end} · ${d.business.name}`}
        action={
          <span className="badge">
            {d.status === "running" ? "Sedang diuji" : "Selesai dievaluasi"}
          </span>
        }
      />
      <div className="evaluation-summary">
        <span>
          Perkiraan keuntungan periode<b>{rupiah(d.expectedProfit)}</b>
        </span>
        <span>
          Hasil nyata
          <b>{d.status === "completed" ? rupiah(actual) : "Belum diisi"}</b>
        </span>
        <span>
          Perkiraan pesanan<b>{number(d.expectedOrders)}</b>
        </span>
      </div>
      {d.status === "completed" && (
        <>
          <p className="evaluation-verdict">
            Hasil aktual{" "}
            {actual >= d.expectedProfit ? "lebih tinggi" : "lebih rendah"}{" "}
            {rupiah(Math.abs(actual - d.expectedProfit))} dari rencana.
          </p>
          <p className="helper">
            Pesanan aktual {number(d.actualOrders ?? 0)}, selisih{" "}
            {number((d.actualOrders ?? 0) - d.expectedOrders)} dari rencana.{" "}
            {d.expectedOrders > 0
              ? `Ini menjadi referensi rentang permintaan untuk keputusan serupa; tidak membuktikan perubahan ini sendirian menyebabkan hasil tersebut.`
              : "Tambahkan konteks hasil sebelum memperbarui asumsi."}
          </p>
          <p className="helper">{d.note}</p>
          <Button
            variant="outline"
            onClick={() => {
              const current = data.business;
              const monthly = ((d.actualOrders ?? 0) * 30) / days;
              const change =
                current.demand > 0
                  ? (monthly / (current.demand * current.days) - 1) * 100
                  : NaN;
              if (!Number.isFinite(change) || change > 1000) {
                notify(
                  "Perbarui permintaan awal bisnis sebelum memakai referensi ini.",
                );
                return;
              }
              const next = {
                ...baseline(current),
                id: crypto.randomUUID(),
                name: `Referensi ${d.scenario.name}`.slice(0, 100),
                demandChange: Math.max(-100, change),
                plan: {
                  ...baseline(current).plan,
                  forecastNote: `Dari ${d.actualOrders} pesanan aktual periode ${d.start}–${d.end}. Bukan estimasi dampak sebab-akibat.`,
                },
              };
              saveScenario(next);
              navigate(`/simulator?id=${next.id}`);
            }}
          >
            Buat simulasi dari hasil ini
          </Button>
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Tutup formulir" : "Perbarui evaluasi"}
          </Button>
        </>
      )}
      <details className="small-details">
        <summary>Kondisi awal yang disimpan</summary>
        <p className="helper">
          Harga {rupiah(d.business.price)} · biaya {rupiah(d.business.cost)} ·
          permintaan {number(d.business.demand)} / hari · biaya tetap{" "}
          {rupiah(d.business.fixed)} / bulan. Keputusan: harga skenario{" "}
          {rupiah(r.price)}, kapasitas {number(r.capacity)} / hari. Acuan ini
          tidak mengikuti perubahan profil berikutnya.
        </p>
      </details>
      {editing && (
        <form
          className="evaluation-form"
          onSubmit={(e) => {
            e.preventDefault();
            const updated = {
              ...d,
              status: "completed" as const,
              actualOrders: orders,
              actualRevenue: revenue,
              actualVariable: variable,
              actualFixed: fixed,
              note,
            };
            const parsed = decisionSchema.safeParse(updated);
            if (!parsed.success) {
              setError(parsed.error.issues[0].message);
              return;
            }
            commit({
              ...data,
              decisions: data.decisions.map((x) =>
                x.id === d.id ? parsed.data : x,
              ),
            });
            notify("Evaluasi hasil nyata disimpan.");
            setError("");
            setEditing(false);
          }}
        >
          <p className="helper">
            Isi total aktual untuk seluruh {days} hari periode uji yang sama.
            Biaya tetap mencakup gaji, pemasaran, dan biaya rutin tambahan.
            Modal pembelian alat dicatat terpisah dalam perencanaan kas.
          </p>
          <div className="form-grid">
            <NumericField
              label="Pesanan aktual periode uji"
              value={orders}
              max={1e7}
              onChange={(n) => setOrders(Math.floor(n))}
            />
            <NumericField
              label="Omzet aktual periode uji"
              unit="Rp"
              value={revenue}
              onChange={setRevenue}
            />
            <NumericField
              label="Biaya variabel aktual periode uji"
              unit="Rp"
              value={variable}
              onChange={setVariable}
            />
            <NumericField
              label="Biaya rutin aktual periode uji"
              unit="Rp"
              value={fixed}
              onChange={setFixed}
            />
          </div>
          <p className="helper">
            Keuntungan aktual: {rupiah(revenue - variable - fixed)} · harga
            rata-rata terlayani: {rupiah(actualMeanPrice)}.
          </p>
          <label className="field">
            <span>Apa yang terjadi selama uji?</span>
            <textarea
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Misalnya: hujan beberapa hari, pemasok terlambat, atau ada acara sekitar."
            />
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit">Simpan evaluasi</Button>
        </form>
      )}
    </Card>
  );
}
export default function Decisions() {
  const { data, commit, notify } = useStore();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const rows = data.decisions.filter(
    (d) => status === "all" || d.status === status,
  );
  return (
    <>
      <PageHead
        title="Belajar dari keputusan Anda"
        sub="Bandingkan rencana dengan hasil nyata. Gunakan pelajarannya untuk langkah berikutnya."
        action={
          <Button asChild variant="outline">
            <Link to="/scenarios">Kembali ke tersimpan</Link>
          </Button>
        }
      />
      <div className="simple-tabs" role="group" aria-label="Status keputusan">
        {[
          ["all", "Semua"],
          ["running", "Sedang diuji"],
          ["completed", "Selesai"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={status === id}
            onClick={() => setStatus(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {!rows.length ? (
        <Card className="empty large">
          <ClipboardCheck size={32} />
          <h2>Mulai dari satu percobaan kecil.</h2>
          <p>
            Di halaman simulasi, pilih “Mulai uji keputusan” untuk menyimpan
            rencana dan mengevaluasi hasilnya.
          </p>
          <Button asChild>
            <Link to="/simulator">Buat keputusan</Link>
          </Button>
        </Card>
      ) : (
        rows.map((d) => (
          <div className="evaluation-wrap" key={d.id}>
            <Evaluation d={d} />
            <button
              className="icon-btn evaluation-delete"
              aria-label={`Hapus evaluasi ${d.scenario.name}`}
              onClick={() => setDeleting(d.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}
      {deleting && (
        <div className="modal-backdrop">
          <section
            className="confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-evaluation"
          >
            <h2 id="delete-evaluation">Hapus evaluasi ini?</h2>
            <p>
              Rencana, hasil nyata, dan acuan yang tersimpan dalam evaluasi ini
              akan dihapus.
            </p>
            <div className="inline-actions">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  commit({
                    ...data,
                    decisions: data.decisions.filter((d) => d.id !== deleting),
                  });
                  setDeleting(null);
                  notify("Evaluasi dihapus.");
                }}
              >
                Hapus evaluasi
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
