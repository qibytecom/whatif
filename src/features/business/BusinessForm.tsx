import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessSchema } from "../../lib/validation";
import type { Business } from "../../types";
import { useStore } from "../../lib/storage";
import { Button } from "../../components/ui/button";
import { Save } from "lucide-react";
export function BusinessForm() {
  const { data, saveBusiness, notify } = useStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<Business>({
    resolver: zodResolver(businessSchema),
    defaultValues: data.business,
  });
  const fields = [
    ["name", "Nama bisnis", "text"],
    ["category", "Kategori bisnis", "text"],
    ["product", "Produk / rata-rata pesanan", "text"],
    ["price", "Harga jual rata-rata (Rp)", "number"],
    ["cost", "Biaya variabel / pesanan (Rp)", "number"],
    ["demand", "Permintaan harian (pesanan)", "number"],
    ["capacity", "Kapasitas maksimum / hari", "number"],
    ["days", "Hari operasional / bulan", "number"],
    ["fixed", "Biaya tetap bulanan (Rp)", "number"],
  ] as const;
  return (
    <form
      onSubmit={handleSubmit((values) => {
        saveBusiness({ ...values, demo: false });
        reset({ ...values, demo: false });
        notify(
          "Profil bisnis berhasil disimpan. Semua hasil telah dihitung ulang.",
        );
      })}
      noValidate
    >
      <div className="business-form-grid">
        {fields.map(([key, label, type]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              type={type}
              {...register(key, { valueAsNumber: type === "number" })}
              aria-invalid={!!errors[key]}
              step={key === "demand" || key === "capacity" ? "any" : 1}
            />
            {errors[key] && (
              <small className="field-error">{errors[key]?.message}</small>
            )}
          </label>
        ))}
      </div>
      <p className="helper">
        Gaji karyawan yang sudah ada termasuk biaya tetap bulanan. Hanya gaji
        karyawan baru yang ditambahkan oleh simulator. Semua nilai uang
        menggunakan Rupiah bulat.
      </p>
      <div className="inline-actions">
        <Button type="submit">
          <Save size={16} />
          Simpan Profil Bisnis
        </Button>
        {isDirty && (
          <small className="muted">Ada perubahan belum disimpan.</small>
        )}
      </div>
    </form>
  );
}
