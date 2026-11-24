import type { Scenario } from "../../types";
export function NumericField({
  label,
  value,
  onChange,
  min = 0,
  max = 1e12,
  step = 1,
  unit,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  help?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {unit && <small>{unit}</small>}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
      />
      {help && <small>{help}</small>}
    </label>
  );
}
export function ScenarioFields({
  s,
  onChange,
}: {
  s: Scenario;
  onChange: (s: Scenario) => void;
}) {
  const update = (key: keyof Scenario, value: number) =>
    onChange({ ...s, [key]: value });
  return (
    <>
      <div className="field-section">
        <h3>Harga & penawaran</h3>
        <label className="slider-field">
          <span>
            Perubahan harga{" "}
            <b>
              {s.priceChange > 0 ? "+" : ""}
              {s.priceChange}%
            </b>
          </span>
          <input
            aria-label="Perubahan harga"
            type="range"
            min="-100"
            max="100"
            step="1"
            value={s.priceChange}
            onChange={(e) => update("priceChange", +e.target.value)}
          />
          <small>
            <span>−100%</span>
            <span>Harga awal</span>
            <span>+100%</span>
          </small>
        </label>
        <div className="form-grid">
          <NumericField
            label="Perubahan harga"
            unit="%"
            min={-100}
            max={1000}
            value={s.priceChange}
            onChange={(n) => update("priceChange", n)}
          />
          <NumericField
            label="Diskon promo"
            unit="%"
            max={100}
            value={s.discount}
            onChange={(n) => update("discount", n)}
          />
        </div>
        {s.plan.products.some((p) => p.weight > 0) ? (
          <p className="helper">
            Biaya mengikuti campuran produk. Ubah harga dan biaya tiap produk
            pada pengaturan operasional.
          </p>
        ) : (
          <NumericField
            label="Biaya variabel / pesanan"
            unit="Rp"
            value={s.cost}
            onChange={(n) => update("cost", n)}
          />
        )}
      </div>
      <div className="field-section">
        <h3>Permintaan & pemasaran</h3>
        <NumericField
          label="Perubahan permintaan"
          unit="%"
          min={-100}
          max={1000}
          value={s.demandChange}
          onChange={(n) => update("demandChange", n)}
          help="Perkiraan Anda sendiri; harga tidak otomatis mengubah permintaan."
        />
        <NumericField
          label="Biaya pemasaran / bulan"
          unit="Rp"
          value={s.marketing}
          onChange={(n) => update("marketing", n)}
        />
      </div>
      <div className="field-section">
        <h3>Karyawan & kapasitas</h3>
        <NumericField
          label="Karyawan tambahan"
          unit="orang"
          max={1000}
          value={s.employees}
          onChange={(n) => update("employees", Math.floor(n))}
        />
        <div className="form-grid">
          <NumericField
            label="Gaji / orang / bulan"
            unit="Rp"
            value={s.salary}
            onChange={(n) => update("salary", n)}
          />
          <NumericField
            label="Kapasitas / orang"
            unit="pesanan/hari"
            max={1e6}
            value={s.addedCapacity}
            onChange={(n) => update("addedCapacity", n)}
          />
        </div>
        <p className="helper">
          Gaji karyawan saat ini sudah termasuk biaya tetap. Karyawan baru hanya
          menambah kapasitas, bukan permintaan.
        </p>
      </div>
    </>
  );
}
