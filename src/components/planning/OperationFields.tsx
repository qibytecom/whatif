import {
  Box,
  Clock,
  Wrench,
  ShoppingBag,
  Store,
  Shield,
  ChartNoAxesCombined,
  Package,
  Trash2,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { Scenario, Plan } from "../../types";
import { NumericField } from "../simulator/ScenarioFields";
import { Button } from "../ui/button";
export const extraChoices = [
  { kind: "marketing", title: "Anggaran pemasaran", icon: ChartNoAxesCombined },
  { kind: "hours", title: "Jam & hari buka", icon: Clock },
  { kind: "stock", title: "Stok & produksi", icon: Box },
  { kind: "equipment", title: "Beli / sewa peralatan", icon: Wrench },
  { kind: "product", title: "Campuran produk", icon: Package },
  { kind: "channel", title: "Kanal penjualan", icon: ShoppingBag },
  { kind: "expansion", title: "Lokasi tambahan", icon: Store },
  { kind: "resilience", title: "Hadapi kondisi sulit", icon: Shield },
] as const;
export function CombinedOperations({
  s,
  onChange,
}: {
  s: Scenario;
  onChange: (s: Scenario) => void;
}) {
  const [kind, setKind] = useState<Plan["kind"]>("basic");
  return (
    <details className="small-details">
      <summary>Gabungkan keputusan operasional</summary>
      <label className="field">
        <span>Asumsi tambahan yang ingin diubah</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Plan["kind"])}
        >
          <option value="basic">Pilih jenis keputusan</option>
          {extraChoices.map((x) => (
            <option key={x.kind} value={x.kind}>
              {x.title}
            </option>
          ))}
        </select>
      </label>
      <p className="helper">
        Asumsi yang sudah Anda isi tetap berlaku ketika memilih jenis tambahan
        lain. Gunakan Reset untuk kembali ke kondisi awal.
      </p>
      {kind !== "basic" && (
        <OperationFields kindOverride={kind} s={s} onChange={onChange} />
      )}
    </details>
  );
}
export function OperationFields({
  s,
  onChange,
  kindOverride,
}: {
  s: Scenario;
  onChange: (s: Scenario) => void;
  kindOverride?: Plan["kind"];
}) {
  const p = s.plan,
    kind = kindOverride ?? p.kind;
  const set = (key: keyof Plan, value: number | boolean) =>
    onChange({ ...s, plan: { ...p, [key]: value } });
  const field = (
    key: keyof Plan,
    label: string,
    unit = "Rp",
    min = 0,
    max = 1e12,
  ) => (
    <NumericField
      key={key}
      label={label}
      unit={unit}
      min={min}
      max={max}
      value={p[key] as number}
      onChange={(n) => set(key, n)}
    />
  );
  return (
    <>
      {kind === "marketing" && (
        <>
          <NumericField
            label="Anggaran pemasaran / bulan"
            unit="Rp"
            value={s.marketing}
            onChange={(marketing) => onChange({ ...s, marketing })}
            help="Tambahan pelanggan tetap merupakan asumsi Anda; iklan tidak otomatis menghasilkan pembeli."
          />
          <label className="field">
            <span>Cara memperkirakan pelanggan baru</span>
            <select
              value={p.marketingModel}
              onChange={(e) =>
                onChange({
                  ...s,
                  plan: {
                    ...p,
                    marketingModel: e.target.value as Plan["marketingModel"],
                  },
                })
              }
            >
              <option value="manual">Isi perubahan pelanggan sendiri</option>
              <option value="funnel">Dari pengunjung & konversi</option>
            </select>
          </label>
          {p.marketingModel === "funnel" && (
            <>
              {field(
                "visitors",
                "Perkiraan pengunjung baru / bulan",
                "orang",
                0,
                1e7,
              )}
              {field("conversion", "Pengunjung yang membeli", "%", 0, 100)}
              {field(
                "repeat",
                "Pembeli baru yang mengulang sekali dalam bulan yang sama",
                "%",
                0,
                100,
              )}
              <p className="helper">
                Tambahan pesanan = pengunjung × konversi × (1 + pembelian
                ulang). Perkiraan pembeli baru{" "}
                {Math.round((p.visitors * p.conversion) / 100)}; biaya per
                pembeli baru{" "}
                {p.visitors * p.conversion > 0
                  ? Math.round(
                      s.marketing / ((p.visitors * p.conversion) / 100),
                    ).toLocaleString("id-ID") + " Rupiah"
                  : "belum dapat dihitung"}
                . Kapasitas tetap membatasi pesanan terlayani.
              </p>
            </>
          )}
        </>
      )}
      {kind === "hours" && (
        <>
          {field("extraHours", "Tambahan jam buka per hari", "jam", 0, 12)}
          {field(
            "ordersPerHour",
            "Tambahan kapasitas tiap jam",
            "pesanan",
            0,
            1e5,
          )}
          {field("costPerHour", "Biaya tambahan tiap jam buka")}
          {field(
            "extraDays",
            "Tambahan / pengurangan hari buka",
            "hari",
            -30,
            30,
          )}
          {field(
            "capacityChange",
            "Perubahan kapasitas layanan per hari",
            "pesanan",
            -1e6,
            1e6,
          )}
          {field(
            "extraFixed",
            "Tambahan listrik, lembur & biaya rutin / bulan",
          )}
          <p className="helper">
            Kapasitas harian mewakili perubahan jam buka. Total hari dibatasi
            1–31; perubahan jam tidak otomatis menciptakan permintaan.
          </p>
        </>
      )}
      {kind === "stock" && (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={p.stockEnabled}
              onChange={(e) => set("stockEnabled", e.target.checked)}
            />
            Perhitungkan ketersediaan stok
          </label>
          {field("initialStock", "Stok awal siap jual", "pesanan", 0, 1e7)}
          {field(
            "reorderPoint",
            "Pesan ulang saat stok tersisa",
            "pesanan",
            0,
            1e7,
          )}
          {field("orderQuantity", "Jumlah setiap pembelian", "pesanan", 1, 1e7)}
          {field("leadDays", "Waktu tunggu pemasok", "hari", 1, 90)}
          {field("shelfDays", "Masa simpan stok", "hari", 1, 3650)}
          <p className="helper">
            Satu unit stok setara bahan untuk satu pesanan. Biaya per unit
            mengikuti biaya variabel pesanan. Stok terbuang dan pesanan yang
            hilang ikut menghitung keuntungan.
          </p>
        </>
      )}
      {kind === "equipment" && (
        <>
          <label className="field">
            <span>Cara mendapatkan alat</span>
            <select
              value={p.investment > 0 ? "buy" : "rent"}
              onChange={(e) =>
                onChange({
                  ...s,
                  plan: {
                    ...p,
                    investment: e.target.value === "buy" ? 5000000 : 0,
                    extraFixed: e.target.value === "rent" ? 500000 : 0,
                  },
                })
              }
            >
              <option value="buy">Beli alat</option>
              <option value="rent">Sewa alat</option>
            </select>
          </label>
          {field("investment", "Pembelian / uang muka alat")}
          {field("extraFixed", "Sewa, perawatan & biaya rutin / bulan")}
          {field("unitSavings", "Penghematan biaya per pesanan")}
          {field(
            "capacityChange",
            "Tambahan kapasitas per hari",
            "pesanan",
            0,
            1e6,
          )}
        </>
      )}
      {kind === "product" && (
        <>
          <p className="helper">
            Masukkan produk dan bobot campuran penjualan. Bobot 1:1 berarti
            masing-masing 50%. Model menggunakan harga dan biaya rata-rata
            tertimbang, berbagi kapasitas usaha yang sama.
          </p>
          {p.products.map((product, i) => (
            <div className="product-input" key={product.id}>
              <label className="field">
                <span>Nama produk {i + 1}</span>
                <input
                  value={product.name}
                  maxLength={100}
                  onChange={(e) =>
                    onChange({
                      ...s,
                      plan: {
                        ...p,
                        products: p.products.map((x) =>
                          x.id === product.id
                            ? { ...x, name: e.target.value }
                            : x,
                        ),
                      },
                    })
                  }
                />
              </label>
              <div className="form-grid">
                {(["price", "cost", "weight"] as const).map((key) => (
                  <NumericField
                    key={key}
                    label={`${key === "price" ? "Harga" : key === "cost" ? "Biaya" : "Bobot"} produk ${i + 1}`}
                    value={product[key]}
                    max={key === "weight" ? 100000 : 1e12}
                    onChange={(n) =>
                      onChange({
                        ...s,
                        plan: {
                          ...p,
                          products: p.products.map((x) =>
                            x.id === product.id ? { ...x, [key]: n } : x,
                          ),
                        },
                      })
                    }
                  />
                ))}
              </div>
              <button
                className="icon-btn"
                aria-label={`Hapus produk ${i + 1}`}
                onClick={() =>
                  onChange({
                    ...s,
                    plan: {
                      ...p,
                      products: p.products.filter((x) => x.id !== product.id),
                    },
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {p.products.length < 20 && (
            <Button
              variant="outline"
              onClick={() =>
                onChange({
                  ...s,
                  plan: {
                    ...p,
                    products: [
                      ...p.products,
                      {
                        id: crypto.randomUUID(),
                        name: "Produk baru",
                        price: 25000,
                        cost: 10000,
                        weight: 1,
                      },
                    ],
                  },
                })
              }
            >
              <Plus size={15} />
              Tambah produk
            </Button>
          )}
          {p.products.length === 0 ||
          p.products.every((x) => x.weight === 0) ? (
            <p className="warning">
              Tambahkan produk dengan bobot lebih dari nol untuk memakai
              campuran produk.
            </p>
          ) : null}
        </>
      )}
      {kind === "channel" && (
        <>
          {field(
            "channelShare",
            "Bagian pesanan melalui kanal ini",
            "%",
            0,
            100,
          )}
          {field("commission", "Komisi kanal", "%", 0, 100)}
          {field(
            "packaging",
            "Biaya kemasan tambahan rata-rata / semua pesanan",
          )}
          <p className="helper">
            Komisi hanya dikenakan pada bagian pesanan kanal yang diisi. Isi
            biaya kemasan sebagai rata-rata seluruh pesanan. Perubahan pelanggan
            tetap diisi terpisah.
          </p>
        </>
      )}
      {kind === "expansion" && (
        <>
          {field("investment", "Modal pembukaan lokasi")}
          {field("extraFixed", "Sewa & biaya rutin lokasi / bulan")}
          {field(
            "capacityChange",
            "Tambahan kapasitas lokasi / hari",
            "pesanan",
            0,
            1e6,
          )}
          <p className="helper">
            Hasil menggabungkan usaha lama dan lokasi baru dengan harga / biaya
            rata-rata yang sama. Isi perubahan total pelanggan kedua lokasi,
            termasuk perpindahan pelanggan lama.
          </p>
        </>
      )}
      {kind === "resilience" && (
        <>
          <NumericField
            label="Biaya variabel baru / pesanan"
            unit="Rp"
            value={s.cost}
            onChange={(cost) => onChange({ ...s, cost })}
          />
          {field("extraFixed", "Tambahan biaya rutin / bulan")}
          <p className="helper">
            Uji penjualan turun atau biaya naik. Periksa daya tahan kas pada
            bagian perjalanan kas.
          </p>
        </>
      )}
    </>
  );
}
