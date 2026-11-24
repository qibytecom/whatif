import { useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  X,
  Settings,
  Plus,
  House,
  SlidersHorizontal,
  Bookmark,
} from "lucide-react";
import { Logo } from "../common";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { Button } from "../ui/button";
import { useStore } from "../../lib/storage";
export function Shell() {
  useDialogFocus();
  const { data, warning, toast, notify, commit } = useStore();
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => notify(""), 4200);
      return () => clearTimeout(id);
    }
  }, [toast, notify]);
  return (
    <div className="simple-shell">
      <header className="simple-header">
        <Link to="/" aria-label="WhatIf beranda">
          <Logo />
        </Link>
        <nav aria-label="Navigasi utama">
          <NavLink to="/" end>
            <House size={15} />
            Beranda
          </NavLink>
          <NavLink to="/simulator">
            <SlidersHorizontal size={15} />
            Simulasi
          </NavLink>
          <NavLink to="/scenarios">
            <Bookmark size={15} />
            Tersimpan
          </NavLink>
        </nav>
        <Link
          className="simple-business"
          to="/settings"
          aria-label="Data bisnis"
        >
          <Settings size={17} />
          <span>{data.business.name}</span>
        </Link>
      </header>
      <div className="simple-content">
        <main>
          {warning && (
            <div className="warning" role="alert">
              {warning}
            </div>
          )}
          <Outlet />
        </main>
        <footer>
          <span>WhatIf · Simulasikan sebelum memutuskan.</span>
          <Link to="/settings">Data tersimpan di browser ini</Link>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Tutup notifikasi" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {!data.onboarded && (
        <div className="modal-backdrop">
          <section
            className="welcome simple-welcome"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <Logo />
            <h1 id="welcome-title">
              Coba dulu.
              <br />
              Putuskan kemudian.
            </h1>
            <p>
              Lihat pengaruh perubahan harga, diskon, atau karyawan ke
              keuntungan bisnis Anda.
            </p>
            <Button onClick={() => commit({ ...data, onboarded: true })}>
              Coba dengan data contoh
            </Button>
            <Button asChild variant="outline">
              <Link
                to="/settings"
                onClick={() => commit({ ...data, onboarded: true })}
              >
                Masukkan data bisnis saya
              </Link>
            </Button>
            <small>Tanpa akun. Data contoh Kopi Senja bersifat fiktif.</small>
          </section>
        </div>
      )}
    </div>
  );
}
export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  const demo = useStore((s) => s.data.business.demo);
  return (
    <div className="page-head">
      <div>
        {demo && <span className="badge">Data Demo</span>}
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="head-actions">
        {action ?? (
          <Button asChild>
            <Link to="/simulator">
              <Plus size={16} />
              Simulasi Baru
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
