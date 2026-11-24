import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlanningReport } from "../components/planning/PlanningReport";
import { Printer, Download } from "lucide-react";
import { PageHead } from "../components/layout/Shell";
import {
  Card,
  Logo,
  SectionTitle,
  ComparisonTable,
  InsightPanel,
} from "../components/common";
import { Button } from "../components/ui/button";
import { ReversePanel, StressPanel } from "../components/simulator/Analysis";
import { useStore, download } from "../lib/storage";
import { baseline } from "../data/demo";
import { comparisonCSV } from "../features/reports/export";
import { simulate } from "../lib/simulation";
import { rupiah, number } from "../lib/formatters";
export default function Reports() {
  const { data } = useStore();
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? "baseline");
  const b = data.business,
    s = data.scenarios.find((x) => x.id === id) ?? baseline(b),
    r = simulate(b, s);
  return (
    <>
      <div className="no-print">
        <PageHead
          title="Dari simulasi ke keputusan."
          sub="Laporan transparan untuk dibaca, dibagikan, dan ditinjau kembali."
          action={
            <>
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    "whatif-perbandingan.csv",
                    comparisonCSV(b, s.id === "baseline" ? [] : [s]),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={16} />
                Ekspor CSV
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={16} />
                Cetak / Simpan PDF
              </Button>
            </>
          }
        />
        <label className="select-label report-selector">
          Keputusan yang dianalisis
          <select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="baseline">Kondisi awal</option>
            {data.scenarios.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <article className="report">
        <div className="report-header">
          <Logo />
          <span>
            LAPORAN KEPUTUSAN BISNIS
            <br />
            {new Date().toLocaleDateString("id-ID", {
              dateStyle: "long",
              timeZone: "Asia/Jakarta",
            })}
          </span>
        </div>
        <h1>
          Langkah berikutnya,
          <br />
          dengan pandangan lebih jelas.
        </h1>
        <div className="report-business">
          <div>
            <h2>
              {b.name}
              {b.demo && <span className="badge">Data Demo · Fiktif</span>}
            </h2>
            <p>
              {b.category} · {b.product}
            </p>
          </div>
          <span className="badge">{s.name}</span>
        </div>
        <Card>
          <SectionTitle title="Kondisi awal bisnis" />
          <dl className="report-baseline">
            {[
              ["Harga jual", rupiah(b.price)],
              ["Biaya variabel / pesanan", rupiah(b.cost)],
              ["Permintaan / hari", number(b.demand)],
              ["Kapasitas / hari", number(b.capacity)],
              ["Hari operasional", `${b.days} hari / bulan`],
              ["Biaya tetap + gaji lama", rupiah(b.fixed)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <SectionTitle title="Asumsi keputusan terpilih" />
          <p className="helper">
            Harga {s.priceChange}%; diskon {s.discount}% pada{" "}
            {s.plan.promoShare}% pesanan; permintaan {s.demandChange}%; biaya
            variabel {rupiah(s.cost)}; pemasaran {rupiah(s.marketing)};{" "}
            {s.employees} karyawan baru × {rupiah(s.salary)} / bulan; kapasitas
            tambahan {number(s.addedCapacity)} / orang / hari.
          </p>
          <p>
            Permintaan belum terlayani:{" "}
            <b>{number(r.unserved)} pesanan / hari</b>. Kapasitas skenario:{" "}
            <b>{number(r.capacity)} pesanan / hari</b>.
          </p>
        </Card>
        <Card>
          <SectionTitle title="Perbandingan hasil bulanan" />
          <ComparisonTable b={b} scenarios={s.id === "baseline" ? [] : [s]} />
        </Card>
        <InsightPanel b={b} s={s} />
        <PlanningReport b={b} s={s} />
        <StressPanel b={b} s={s} readOnly />
        <ReversePanel b={b} s={s} readOnly />
        <section className="report-limitations">
          <h3>Asumsi & batas model</h3>
          <p>
            Proyeksi hipotetis berdasarkan input pengguna, bukan jaminan hasil.
            Model rata-rata satu pesanan; diskon mengikuti bagian pesanan promo
            (bawaan 100%). Gaji lama termasuk biaya tetap. Penambahan karyawan
            tidak menciptakan permintaan. Belum termasuk pajak, bunga,
            penyusutan, modal kerja, atau arus kas.
          </p>
          <p>
            Harga dibulatkan ke Rupiah terdekat sebelum menghitung omzet.
            Pesanan bulanan dibulatkan ke bawah; kebutuhan pesanan target
            dibulatkan ke atas. Uji sensitivitas adalah perubahan permintaan
            relatif terhadap skenario, bukan probabilitas statistik.
          </p>
          <small>
            Dibuat dengan WhatIf · Simulasikan sebelum memutuskan. · Data
            tersimpan lokal.
          </small>
        </section>
      </article>
    </>
  );
}
