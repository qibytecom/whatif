import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
});
test("simple navigation and focused inputs save, reopen, compare and delete", async ({
  page,
}) => {
  await expect(page.locator("nav a")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Apa yang ingin Anda coba?" }),
  ).toBeVisible();
  await page
    .locator(".decision-choice")
    .filter({ hasText: "Ubah harga" })
    .click();
  await expect(page.getByRole("spinbutton")).toHaveCount(2);
  await expect(page.locator(".simple-details").first()).not.toHaveAttribute(
    "open",
    "",
  );
  await page
    .locator(".simple-inputs")
    .getByLabel("Harga naik / turun")
    .fill("10");
  await page
    .locator(".simple-inputs")
    .getByLabel("Pelanggan bertambah / berkurang")
    .fill("-5");
  await expect(page.locator(".result-amount")).toContainText("8.290.000");
  await expect(page.locator(".result-delta")).toContainText("Bertambah");
  await page.getByLabel("Nama simulasi").fill("Harga sederhana");
  await page
    .getByRole("button", { name: "Simpan simulasi", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Nama simulasi")).toHaveValue("Harga sederhana");
  await page.getByRole("link", { name: "Tersimpan", exact: true }).click();
  await page.getByLabel("Bandingkan", { exact: true }).check();
  await expect(
    page.getByRole("heading", { name: "Perbandingan keputusan" }),
  ).toBeVisible();
  await page.getByLabel("Duplikat Harga sederhana").click();
  await expect(
    page.getByRole("heading", {
      name: "Harga sederhana (salinan)",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Hapus Harga sederhana (salinan)").click();
  await page
    .getByRole("button", { name: "Hapus skenario", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Harga sederhana (salinan)",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("decision types expose relevant inputs and advanced analysis remains available", async ({
  page,
}) => {
  await page.goto("/simulator");
  await page.getByRole("button", { name: "Beri diskon", exact: true }).click();
  await expect(page.getByRole("spinbutton")).toHaveCount(3);
  await page
    .locator(".simple-inputs")
    .getByRole("spinbutton", { name: /^Diskon/ })
    .fill("10");
  await page
    .locator(".simple-inputs")
    .getByLabel("Biaya promosi / bulan")
    .fill("500000");
  await expect(page.locator(".result-amount")).toContainText("3.500.000");
  await page
    .getByRole("button", { name: "Tambah karyawan", exact: true })
    .click();
  await page
    .locator(".simple-inputs")
    .getByLabel("Karyawan tambahan")
    .fill("1");
  await expect(page.locator(".result-amount")).toContainText("3.600.000");
  await page
    .getByText("Lihat rincian & pengaturan tambahan", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Perbandingan lengkap" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Analisis target & risiko" }).click();
  await page.getByLabel("Target laba operasional / bulan").fill("20000000");
  await expect(page.getByText("Target tidak layak")).toBeVisible();
  await page.getByLabel("Target laba operasional / bulan").fill("6000000");
  await expect(page.getByText("Kapasitas memadai")).toBeVisible();
  await page.goto("/reports");
  await expect(page.locator(".report")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".simple-header")).not.toBeVisible();
});
test("existing data and backups are preserved", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByText("Cadangan data & pengaturan tambahan", { exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor JSON", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("whatif-backup.json");
  await page.getByLabel("Impor cadangan JSON").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await expect(page.getByRole("alert")).toContainText("Cadangan tidak valid");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whatif:v1")!),
  );
  data.business.name = "Bisnis tersimpan";
  await page.getByLabel("Impor cadangan JSON").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page
    .getByRole("button", { name: "Pulihkan data", exact: true })
    .click();
  await expect(page.getByLabel("Nama bisnis")).toHaveValue("Bisnis tersimpan");
  await page.reload();
  await expect(page.getByLabel("Nama bisnis")).toHaveValue("Bisnis tersimpan");
});
for (const width of [1440, 768, 390])
  test(`simple layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of [
      "/",
      "/simulator",
      "/scenarios",
      "/settings",
      "/insights",
      "/reports",
      "/history",
      "/decisions",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
    await page.getByRole("link", { name: "Beranda", exact: true }).click();
    await page.screenshot({
      path: `test-results/simple-home-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("link", { name: "Simulasi", exact: true }).click();
    await expect(page.locator(".simple-inputs")).toBeVisible();
    await page.screenshot({
      path: `test-results/simple-simulator-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
