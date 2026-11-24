export const rupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
export const number = (v: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v);
export const percent = (v: number) => `${number(v)}%`;
export const compact = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
