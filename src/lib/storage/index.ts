import { create } from "zustand";
import type { Backup, Business, Scenario } from "../../types";
import { backupSchema } from "../validation";
import { demoBusiness } from "../../data/demo";
export const KEY = "whatif:v1";
export const initialData = (): Backup => ({
  version: 1,
  business: demoBusiness,
  scenarios: [],
  target: 15000000,
  stress: [-20, 0, 20],
  onboarded: false,
  history: [],
  decisions: [],
});
export function parseBackup(text: string): Backup {
  return backupSchema.parse(JSON.parse(text));
}
let warning = "";
function read(): Backup {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseBackup(raw) : initialData();
  } catch {
    warning =
      "Data lokal tidak dapat dibaca. Data asli tetap disimpan; pulihkan melalui impor cadangan.";
    return initialData();
  }
}
interface Store {
  data: Backup;
  warning: string;
  toast: string;
  notify: (text: string) => void;
  commit: (data: Backup) => boolean;
  saveBusiness: (b: Business) => void;
  saveScenario: (s: Scenario) => boolean;
  remove: (id: string) => void;
}
export const useStore = create<Store>((set, get) => ({
  data: read(),
  warning,
  toast: "",
  notify: (toast) => set({ toast }),
  commit: (data) => {
    const parsed = backupSchema.safeParse(data);
    if (!parsed.success) {
      set({ toast: `Data belum disimpan: ${parsed.error.issues[0].message}` });
      return false;
    }
    const valid = parsed.data;
    try {
      localStorage.setItem(KEY, JSON.stringify(valid));
      set({ data: valid, warning: "" });
    } catch {
      set({
        data: valid,
        warning:
          "Penyimpanan browser tidak tersedia. Ekspor cadangan sebelum menutup halaman.",
      });
    }
    return true;
  },
  saveBusiness: (business) =>
    get().commit({ ...get().data, business, onboarded: true }),
  saveScenario: (s) => {
    const data = get().data;
    const saved = get().commit({
      ...data,
      scenarios: [s, ...data.scenarios.filter((x) => x.id !== s.id)],
    });
    if (saved) get().notify("Skenario berhasil disimpan di browser ini.");
    return saved;
  },
  remove: (id) =>
    get().commit({
      ...get().data,
      scenarios: get().data.scenarios.filter((x) => x.id !== id),
    }),
}));
export function download(
  name: string,
  body: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
