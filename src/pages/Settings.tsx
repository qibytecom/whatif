import { useRef, useState } from "react";
import { Upload, Download, Database, HardDrive } from "lucide-react";
import { PageHead } from "../components/layout/Shell";
import { Card, SectionTitle } from "../components/common";
import { Button } from "../components/ui/button";
import { BusinessForm } from "../features/business/BusinessForm";
import { useStore, download, parseBackup, initialData } from "../lib/storage";
import { demoBusiness } from "../data/demo";
import type { Backup } from "../types";
export default function Settings() {
  const { data, commit, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);
  async function read(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5e6) throw new Error("File maksimal 5 MB.");
      setPending(parseBackup(await file.text()));
      setError("");
    } catch {
      setError(
        "Cadangan tidak valid. Gunakan JSON WhatIf versi 1 dengan profil dan skenario yang valid.",
      );
    }
    if (input.current) input.current.value = "";
  }
  return (
    <>
      <PageHead
        title="Data bisnis Anda"
        sub="Isi sekali. Data ini dipakai sebagai dasar semua simulasi."
        action={
          <span className="badge">
            <HardDrive size={14} />
            Penyimpanan lokal
          </span>
        }
      />
      <Card>
        <SectionTitle
          title="Kondisi bisnis saat ini"
          sub="Gunakan angka rata-rata yang paling mendekati usaha Anda."
        />
        <BusinessForm key={formKey} />
      </Card>
      <details className="simple-details">
        <summary>Cadangan data & pengaturan tambahan</summary>
        <div className="settings-extras">
          <div className="settings-grid">
            <Card>
              <SectionTitle
                title="Cadangan data"
                sub="Simpan salinan. Bawa data Anda kapan saja."
              />
              <p className="helper">
                Profil, skenario, target, dan pengaturan sensitivitas hanya
                tersimpan di browser perangkat ini. Membersihkan data browser
                akan menghapusnya.
              </p>
              <div className="inline-actions">
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      "whatif-backup.json",
                      JSON.stringify(data, null, 2),
                    )
                  }
                >
                  <Download size={16} />
                  Ekspor JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => input.current?.click()}
                >
                  <Upload size={16} />
                  Impor JSON
                </Button>
                <input
                  ref={input}
                  className="sr-only"
                  type="file"
                  accept=".json,application/json"
                  aria-label="Impor cadangan JSON"
                  onChange={(e) => read(e.target.files?.[0])}
                />
              </div>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </Card>
            <Card>
              <SectionTitle
                title="Data contoh"
                sub="Eksplorasi tanpa mengubah data bisnis asli."
              />
              <p className="helper">
                Kopi Senja adalah usaha fiktif. Mengaktifkan contoh mengganti
                profil bisnis; skenario Anda tetap disimpan dan dihitung ulang.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  commit({ ...data, business: demoBusiness, onboarded: true });
                  setFormKey(formKey + 1);
                  notify("Data contoh Kopi Senja diaktifkan.");
                }}
              >
                <Database size={16} />
                Aktifkan data contoh
              </Button>
            </Card>
          </div>
          <Card>
            <SectionTitle title="Model & transparansi" />
            <div className="model-notes">
              <p>
                Harga skenario = harga awal × (1 + perubahan harga) × (1 −
                diskon). Harga akhir dibulatkan satu kali ke Rupiah terdekat.
              </p>
              <p>
                Permintaan dan kapasitas dihitung tanpa pembulatan antara.
                Pesanan bulanan = pembulatan ke bawah dari min(permintaan
                harian, kapasitas harian) × hari operasional.
              </p>
              <p>
                Laba operasional = omzet − biaya variabel − biaya tetap −
                pemasaran − gaji tambahan. Model satu produk / rata-rata
                pesanan; belum memasukkan pajak, bunga, penyusutan, modal kerja,
                dan arus kas.
              </p>
              <p>
                Target menggunakan pembulatan ke atas pesanan yang diperlukan.
                Asumsi permintaan diisi pengguna, bukan prediksi pasar atau
                jaminan pendapatan.
              </p>
            </div>
          </Card>
        </div>
      </details>
      {pending && (
        <div className="modal-backdrop">
          <section
            className="confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <h2 id="import-title">Pulihkan cadangan ini?</h2>
            <p>
              {pending.business.name} · {pending.scenarios.length} skenario.
              Data saat ini akan diganti. Ekspor salinan sebelum melanjutkan
              jika diperlukan.
            </p>
            <div className="inline-actions">
              <Button variant="outline" onClick={() => setPending(null)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  commit({ ...initialData(), ...pending, onboarded: true });
                  setPending(null);
                  setFormKey(formKey + 1);
                  notify("Cadangan berhasil dipulihkan.");
                }}
              >
                Pulihkan data
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
