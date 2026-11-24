import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
});
async function choose(page: Page, name: string) {
  await page.goto("/simulator");
  await page.locator(".more-decisions>summary").click();
  await page
    .locator(".extra-decisions")
    .getByRole("button", { name, exact: true })
    .click();
}
test("safe threshold, exact profit explanation and alternatives", async ({
  page,
}) => {
  await page.goto("/simulator");
  await page
    .locator(".simple-inputs")
    .getByLabel("Harga naik / turun")
    .fill("10");
  await expect(page.locator(".safe-card>strong")).toContainText("892");
  await page.getByText("Mengapa hasilnya berubah?", { exact: true }).click();
  await expect(page.locator(".explanation-row.total")).toContainText(
    "2.600.000",
  );
  await page.getByText("Pilihan lain & langkah uji", { exact: true }).click();
  await expect(
    page.getByText("Permintaan belum bertambah", { exact: true }),
  ).toBeVisible();
});
test("historical CSV, rolling forecast, scenario application and persistence", async ({
  page,
}) => {
  await page.goto("/history");
  await expect(
    page.getByText("Mulai dari catatan bisnis Anda.", { exact: true }),
  ).toBeVisible();
  const rows = Array.from({ length: 56 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 29 + i));
    const closed = date.getUTCDay() === 0;
    return `${date.toISOString().slice(0, 10)},${closed ? 0 : 40},25000,10000,${closed ? "closed" : "normal"},data pengujian`;
  });
  await page.getByLabel("Impor riwayat CSV").setInputFiles({
    name: "sales.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "tanggal,pesanan,harga,biaya,kejadian,catatan\n" + rows.join("\n"),
    ),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan catatan", exact: true })
    .click();
  await expect(page.getByText(/Pola hari dalam minggu/).first()).toBeVisible();
  await page
    .getByRole("link", { name: "Gunakan prediksi untuk simulasi" })
    .click();
  await page
    .getByRole("button", { name: "Terapkan perkiraan riwayat" })
    .click();
  await expect(page.locator(".source-note")).toContainText("56 catatan");
  await page
    .getByRole("button", { name: "Simpan simulasi", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".source-note")).toContainText("riwayat");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whatif:v1")!),
  );
  expect(data.history).toHaveLength(56);
  expect(data.scenarios[0].plan.demandSource).toBe("history");
});
test("decision trial, frozen baseline, actual evaluation and learning reference", async ({
  page,
}) => {
  await page.goto("/simulator");
  await page
    .locator(".simple-inputs")
    .getByLabel("Harga naik / turun")
    .fill("10");
  await page
    .getByRole("button", { name: "Mulai uji keputusan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simpan & mulai uji", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("dimulai");
  await page.goto("/settings");
  await page.getByLabel("Harga jual rata-rata (Rp)").fill("30000");
  await page.getByRole("button", { name: "Simpan Profil Bisnis" }).click();
  await page.goto("/decisions");
  await page.getByLabel("Pesanan aktual periode uji").fill("1000");
  await page.getByLabel("Omzet aktual periode uji").fill("25000000");
  await page.getByLabel("Biaya variabel aktual periode uji").fill("10000000");
  await page.getByLabel("Biaya rutin aktual periode uji").fill("9000000");
  await page
    .getByLabel("Apa yang terjadi selama uji?")
    .fill("Penjualan lebih sepi dari perkiraan.");
  await page
    .getByRole("button", { name: "Simpan evaluasi", exact: true })
    .click();
  await expect(page.locator(".evaluation-summary")).toContainText("6.000.000");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whatif:v1")!),
  );
  expect(data.decisions[0].business.price).toBe(25000);
  expect(data.business.price).toBe(30000);
  await page
    .getByRole("button", { name: "Buat simulasi dari hasil ini" })
    .click();
  await expect(page.getByLabel("Nama simulasi")).toHaveValue(/Referensi/);
});
test("inventory limits served orders and updates cash projection", async ({
  page,
}) => {
  await choose(page, "Stok & produksi");
  await page
    .locator(".simple-inputs")
    .getByLabel("Stok awal siap jual")
    .fill("0");
  await expect(page.locator(".result-warning")).toContainText("stok habis");
  await page.getByText("Perjalanan kas, modal & stok", { exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Stok akhir", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Gunakan titik pesan ulang ini" })
    .click();
  await expect(
    page.locator(".simple-inputs").getByLabel("Pesan ulang saat stok tersisa"),
  ).not.toHaveValue("50");
  await page
    .getByRole("button", { name: "Simpan simulasi", exact: true })
    .click();
  await page.reload();
  await expect(
    page.locator(".simple-inputs").getByLabel("Stok awal siap jual"),
  ).toHaveValue("0");
});
test("equipment savings and capital are distinct, report uses selected plan", async ({
  page,
}) => {
  await choose(page, "Beli / sewa peralatan");
  await page.getByLabel("Cara mendapatkan alat").selectOption("buy");
  await page
    .locator(".simple-inputs")
    .getByLabel("Penghematan biaya per pesanan")
    .fill("1000");
  await expect(page.locator(".result-amount")).toContainText("7.640.000");
  await page
    .getByRole("button", { name: "Simpan simulasi", exact: true })
    .click();
  await page
    .getByText("Lihat rincian & pengaturan tambahan", { exact: true })
    .click();
  await page.getByRole("link", { name: "Buka laporan", exact: true }).click();
  await expect(page.locator(".report")).toContainText("5.000.000");
  await expect(
    page.getByRole("heading", { name: "Perjalanan kas & kebutuhan modal" }),
  ).toBeVisible();
});
test("weighted products and channel commissions run through shared engine", async ({
  page,
}) => {
  await choose(page, "Campuran produk");
  await page
    .getByRole("button", { name: "Tambah produk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tambah produk", exact: true })
    .click();
  await page
    .locator(".simple-inputs")
    .getByLabel("Harga produk 1")
    .fill("20000");
  await page
    .locator(".simple-inputs")
    .getByLabel("Harga produk 2")
    .fill("40000");
  await expect(page.locator(".result-amount")).toContainText("11.800.000");
  await choose(page, "Kanal penjualan");
  await page
    .locator(".simple-inputs")
    .getByLabel("Bagian pesanan melalui kanal ini")
    .fill("100");
  await page.locator(".simple-inputs").getByLabel("Komisi kanal").fill("20");
  await expect(page.locator(".result-amount")).toContainText("1.400.000");
});
test("marketing conversion, operating days, expansion and resilience are functional", async ({
  page,
}) => {
  await choose(page, "Anggaran pemasaran");
  await page
    .locator(".simple-inputs")
    .getByLabel("Anggaran pemasaran / bulan")
    .fill("1000000");
  await page
    .getByLabel("Cara memperkirakan pelanggan baru")
    .selectOption("funnel");
  await page
    .locator(".simple-inputs")
    .getByLabel("Pengunjung yang membeli")
    .fill("10");
  await page
    .locator(".simple-inputs")
    .getByLabel("Pembeli baru yang mengulang")
    .fill("20");
  await expect(page.locator(".result-amount")).toContainText("7.400.000");
  await choose(page, "Jam & hari buka");
  await page
    .locator(".simple-inputs")
    .getByLabel("Tambahan / pengurangan hari buka")
    .fill("2");
  await expect(page.locator(".result-amount")).toContainText("7.800.000");
  await choose(page, "Lokasi tambahan");
  await page
    .locator(".simple-inputs")
    .getByLabel("Sewa & biaya rutin lokasi / bulan")
    .fill("5000000");
  await page
    .locator(".simple-inputs")
    .getByLabel("Tambahan kapasitas lokasi / hari")
    .fill("50");
  await page
    .locator(".simple-inputs")
    .getByLabel("Pelanggan bertambah / berkurang")
    .fill("100");
  await expect(page.locator(".result-amount")).toContainText("17.200.000");
  await choose(page, "Hadapi kondisi sulit");
  await page
    .locator(".simple-inputs")
    .getByLabel("Biaya variabel baru / pesanan")
    .fill("15000");
  await expect(page.locator(".result-amount")).toContainText("1.400.000");
});
test("cash timing and combined operational decisions persist", async ({
  page,
}) => {
  await page.goto("/simulator");
  await page.getByText("Perjalanan kas, modal & stok", { exact: true }).click();
  await page.getByLabel("Pembayaran pelanggan setelah").fill("30");
  await page.getByLabel("Periode proyeksi").fill("1");
  await expect(
    page.locator(".panel-body").filter({ hasText: "Di luar periode:" }),
  ).toContainText("26.000.000");
  await page
    .getByText("Lihat rincian & pengaturan tambahan", { exact: true })
    .click();
  await page
    .getByText("Gabungkan keputusan operasional", { exact: true })
    .click();
  await page
    .getByLabel("Asumsi tambahan yang ingin diubah")
    .selectOption("channel");
  await page
    .locator(".advanced-grid")
    .getByLabel("Bagian pesanan melalui kanal ini")
    .fill("100");
  await page.locator(".advanced-grid").getByLabel("Komisi kanal").fill("20");
  await expect(page.locator(".result-amount")).toContainText("1.400.000");
  await page
    .getByRole("button", { name: "Simpan simulasi", exact: true })
    .click();
  await page.reload();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whatif:v1")!),
  );
  expect(data.scenarios[0].plan.receiveDays).toBe(30);
  expect(data.scenarios[0].plan.commission).toBe(20);
});
