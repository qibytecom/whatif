import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Upload,
  Download,
  Plus,
  Trash2,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, SectionTitle } from "../components/common";
import { PageHead } from "../components/layout/Shell";
import { Button } from "../components/ui/button";
import { NumericField } from "../components/simulator/ScenarioFields";
import { useStore, download } from "../lib/storage";
import {
  forecast,
  today,
  eventLabels,
  importSales,
  salesCSV,
  shiftDate,
} from "../lib/forecast";
import { saleSchema } from "../lib/validation/planning";
import type { Sale } from "../types";
import { number } from "../lib/formatters";
export default function History() {
  const { data, commit, notify } = useStore();
  const b = data.business;
  const [horizon, setHorizon] = useState(30),
    [date, setDate] = useState(today()),
    [orders, setOrders] = useState(Math.round(b.demand)),
    [price, setPrice] = useState(b.price),
    [cost, setCost] = useState(b.cost),
    [event, setEvent] = useState<Sale["event"]>("normal"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Sale[] | null>(null),
    [deleting, setDeleting] = useState<string | null>(null),
    [all, setAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const f = forecast(data.history, horizon);
  const save = () => {
    const parsed = saleSchema.safeParse({
      date,
      orders,
      price,
      cost,
      event,
      note,
    });
    if (!parsed.success || date > today()) {
      setError(
        parsed.success
          ? "Tanggal tidak boleh di masa depan."
          : parsed.error.issues[0].message,
      );
      return;
    }
    if (data.history.some((r) => r.date === date)) {
      setPending([parsed.data]);
      return;
    }
    if (data.history.length >= 10000) {
      setError(
        "Maksimal 10.000 catatan. Ekspor cadangan sebelum mengurangi riwayat.",
      );
      return;
    }
    if (
      !commit({
        ...data,
        history: [...data.history, parsed.data].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      })
    )
      return;
    setError("");
    notify("Catatan penjualan disimpan.");
  };
  async function read(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5e6) throw new Error("File maksimal 5 MB.");
      const rows = importSales(await file.text(), b.price, b.cost);
      if (rows.some((r) => r.date > today()))
        throw new Error(
          "Catatan masa depan tidak dapat diimpor sebagai hasil nyata.",
        );
      setPending(rows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV gagal dibaca.");
    }
    if (input.current) input.current.value = "";
  }
  const records = [...data.history].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <>
      <PageHead
        title="Arah bisnis Anda"
        sub="Catat penjualan. Kenali polanya. Gunakan sebagai dasar keputusan."
        action={
          <Button asChild variant="outline">
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        }
      />
      <Card className="forecast-card">
        <SectionTitle
          title="Perkiraan pesanan berikutnya"
          sub="Dari riwayat bisnis ini, dengan asumsi harga dan kondisi dasar tetap."
          action={
            <select
              aria-label="Horizon prediksi"
              value={horizon}
              onChange={(e) => setHorizon(+e.target.value)}
            >
              {[7, 30, 90].map((h) => (
                <option key={h} value={h}>
                  {h} hari
                </option>
              ))}
            </select>
          }
        />
        {!f.available ? (
          <div className="forecast-empty">
            <TrendingUp size={28} />
            <h3>Mulai dari catatan bisnis Anda.</h3>
            <p>{f.reason}</p>
            <p className="helper">
              Ambang awal ini belum menjamin model akurat. Catat hari tutup
              sebagai nol; tandai promo, perubahan harga, dan stok habis.
            </p>
          </div>
        ) : (
          <>
            <div className="forecast-stats">
              <div>
                <span>Perkiraan {horizon} hari</span>
                <strong>{number(f.total)} pesanan</strong>
              </div>
              <div>
                <span>Rata-rata selisih saat diuji</span>
                <strong>±{number(f.mae)} pesanan</strong>
              </div>
            </div>
            <p className="helper">
              {f.method} · {f.usable} catatan · {f.testCount} uji bergulir ·{" "}
              {f.excluded} catatan khusus dipisahkan.
            </p>
            {f.missingDays > 0 && (
              <p className="helper">
                {f.missingDays} tanggal belum memiliki catatan dan tidak
                dianggap sebagai nol penjualan.
              </p>
            )}
            {f.referencePrice !== b.price && (
              <p className="warning">
                Harga normal terakhir dalam riwayat berbeda dari harga profil
                saat ini. Model belum memperkirakan respons pelanggan terhadap
                perubahan harga tersebut.
              </p>
            )}
            {data.history.some((r) => r.note.includes("CONTOH FIKTIF")) && (
              <p className="warning">
                Riwayat memuat data contoh fiktif. Gunakan data bisnis nyata
                untuk keputusan Anda.
              </p>
            )}
            {f.stale > 7 && (
              <p className="warning">
                Catatan terakhir {f.last}, sudah {f.stale} hari lalu. Tambahkan
                data terbaru sebelum mengandalkan perkiraan ini.
              </p>
            )}
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={f.rows}
                  margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
                >
                  <CartesianGrid vertical={false} stroke="#e7e7e7" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => String(v).slice(5)}
                    minTickGap={25}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(v) => `Tanggal ${v}`}
                    formatter={(v, n) => [
                      number(Number(v)),
                      n === "orders"
                        ? "Perkiraan"
                        : n === "low"
                          ? "Batas sensitivitas bawah"
                          : "Batas sensitivitas atas",
                    ]}
                  />
                  <Line
                    dataKey="low"
                    stroke="#a0a0a0"
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="high"
                    stroke="#a0a0a0"
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="orders"
                    stroke="#19181e"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="helper">
              {f.rangeNote} Metode dipilih dengan galat terendah dari tiga acuan
              sederhana; belum memperkirakan pengaruh harga atau promo baru.
            </p>
            <details className="small-details">
              <summary>Dasar pemilihan prediksi</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Metode acuan</th>
                      <th>Rata-rata selisih pesanan / hari</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.scoreboard.map((x) => (
                      <tr key={x.name}>
                        <td>{x.name}</td>
                        <td>{number(x.mae)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="helper">
                Setiap uji memakai catatan yang lebih awal untuk memperkirakan
                catatan berikutnya. Hasil uji ini dipakai memilih metode; belum
                mengukur ketepatan total periode 7, 30, atau 90 hari.
              </p>
            </details>
            <Button asChild variant="outline">
              <Link to="/simulator?forecast=1">
                Gunakan prediksi untuk simulasi
              </Link>
            </Button>
          </>
        )}
      </Card>
      <div className="history-layout">
        <Card>
          <SectionTitle
            title="Tambah catatan harian"
            sub="Satu catatan per tanggal; gunakan jumlah pesanan yang benar-benar terlayani."
          />
          <label className="field">
            <span>Tanggal penjualan</span>
            <input
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <NumericField
            label="Pesanan terlayani"
            max={1e6}
            value={orders}
            onChange={(n) => setOrders(Math.floor(n))}
          />
          <label className="field">
            <span>Kondisi hari itu</span>
            <select
              value={event}
              onChange={(e) => {
                const next = e.target.value as Sale["event"];
                setEvent(next);
                if (next === "closed") setOrders(0);
              }}
            >
              {Object.entries(eventLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <details className="small-details">
            <summary>Harga, biaya & catatan</summary>
            <NumericField
              label="Harga rata-rata saat itu"
              value={price}
              onChange={setPrice}
            />
            <NumericField
              label="Biaya variabel saat itu"
              value={cost}
              onChange={setCost}
            />
            <label className="field">
              <span>Catatan kejadian</span>
              <textarea
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </details>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button onClick={save}>
            <Plus size={15} />
            Simpan catatan
          </Button>
        </Card>
        <Card>
          <SectionTitle
            title="Riwayat penjualan"
            sub={`${data.history.length} tanggal tersimpan di browser ini`}
          />
          <div className="inline-actions">
            <Button variant="outline" onClick={() => input.current?.click()}>
              <Upload size={15} />
              Impor CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  "whatif-penjualan.csv",
                  salesCSV(data.history),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={15} />
              Ekspor CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                download(
                  "template-penjualan.csv",
                  "tanggal,pesanan,harga,biaya,kejadian,catatan\n2026-01-01,40,25000,10000,normal,",
                  "text/csv",
                )
              }
            >
              Template CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const samples: Sale[] = Array.from({ length: 56 }, (_, i) => {
                  const date = shiftDate(today(), i - 56),
                    day = new Date(date + "T00:00:00Z").getUTCDay();
                  return {
                    date,
                    orders: [0, 32, 35, 38, 40, 45, 50][day],
                    price: 25000,
                    cost: 10000,
                    event: day === 0 ? "closed" : "normal",
                    note: "CONTOH FIKTIF — bukan penjualan nyata",
                  };
                });
                download(
                  "contoh-fiktif-penjualan.csv",
                  salesCSV(samples),
                  "text/csv;charset=utf-8",
                );
              }}
            >
              Contoh CSV fiktif
            </Button>
            <input
              className="sr-only"
              aria-label="Impor riwayat CSV"
              ref={input}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => read(e.target.files?.[0])}
            />
          </div>
          {!records.length ? (
            <div className="empty">
              <ClipboardList size={28} />
              <h3>Belum ada catatan.</h3>
              <p>
                Isi dari catatan usaha atau impor spreadsheet. Tidak ada riwayat
                fiktif yang ditambahkan otomatis.
              </p>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Pesanan</th>
                      <th>Kondisi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(all ? records : records.slice(0, 14)).map((r) => (
                      <tr key={r.date}>
                        <td>
                          {r.date}
                          <small className="record-note">{r.note}</small>
                        </td>
                        <td>{number(r.orders)}</td>
                        <td>{eventLabels[r.event]}</td>
                        <td>
                          <button
                            className="icon-btn"
                            aria-label={`Hapus catatan ${r.date}`}
                            onClick={() => setDeleting(r.date)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {records.length > 14 && (
                <Button variant="ghost" onClick={() => setAll(!all)}>
                  {all ? "Tampilkan lebih sedikit" : "Tampilkan semua catatan"}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>
      {(pending || deleting) && (
        <div className="modal-backdrop">
          <section
            className="confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-confirm"
          >
            <h2 id="history-confirm">
              {pending ? "Simpan catatan ini?" : "Hapus catatan harian?"}
            </h2>
            <p>
              {pending
                ? `${pending.length} catatan valid. ${pending.filter((r) => data.history.some((x) => x.date === r.date)).length} tanggal yang sama akan diganti; tanggal lainnya tetap tersimpan.`
                : `Catatan ${deleting} akan dihapus dari riwayat. Prediksi akan dihitung ulang.`}
            </p>
            {pending?.some((r) => r.note.includes("CONTOH FIKTIF")) && (
              <p className="warning">
                File ini berisi contoh fiktif untuk mencoba aplikasi, bukan
                riwayat penjualan bisnis Anda.
              </p>
            )}
            <div className="inline-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setPending(null);
                  setDeleting(null);
                }}
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  if (pending) {
                    const map = new Map(data.history.map((r) => [r.date, r]));
                    pending.forEach((r) => map.set(r.date, r));
                    if (map.size > 10000) {
                      setError("Maksimal 10.000 catatan.");
                      setPending(null);
                      return;
                    }
                    commit({
                      ...data,
                      history: [...map.values()].sort((a, b) =>
                        a.date.localeCompare(b.date),
                      ),
                    });
                    setPending(null);
                    notify("Riwayat berhasil diperbarui.");
                  } else {
                    commit({
                      ...data,
                      history: data.history.filter((r) => r.date !== deleting),
                    });
                    setDeleting(null);
                    notify("Catatan dihapus.");
                  }
                }}
              >
                {pending ? "Simpan catatan" : "Hapus catatan"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
