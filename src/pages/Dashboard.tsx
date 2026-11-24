import { Link } from "react-router-dom";
import {
  Tag,
  Megaphone,
  Users,
  Pencil,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";
import { extraChoices } from "../components/planning/OperationFields";
import { Card } from "../components/common";
import { Button } from "../components/ui/button";
import { useStore } from "../lib/storage";
import { simulate } from "../lib/simulation";
import { rupiah, number } from "../lib/formatters";
export default function Dashboard() {
  const { business: b, scenarios } = useStore((s) => s.data);
  const r = simulate(b);
  return (
    <div className="simple-home">
      <div className="simple-heading">
        <span className="eyebrow">
          WHATIF {b.demo && <span className="badge">Data Demo</span>}
        </span>
        <h1>Bagaimana jika bisnis Anda…</h1>
        <p>Pilih satu perubahan. Lihat pengaruhnya ke keuntungan.</p>
      </div>
      <Card className="home-baseline">
        <div>
          <span>Keuntungan bisnis saat ini / bulan</span>
          <strong>{rupiah(r.profit)}</strong>
          <p>
            {b.name} · {number(b.demand)} pesanan per hari
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/settings">
            <Pencil size={14} />
            Ubah data bisnis
          </Link>
        </Button>
      </Card>
      <h2 className="simple-question">Apa yang ingin Anda coba?</h2>
      <div className="decision-choices">
        {[
          {
            icon: Tag,
            title: "Ubah harga",
            description: "Kalau harga naik atau turun, masih untung?",
            type: 0,
          },
          {
            icon: Megaphone,
            title: "Beri diskon",
            description: "Apakah lebih banyak pembeli menutup biaya promo?",
            type: 1,
          },
          {
            icon: Users,
            title: "Tambah karyawan",
            description: "Apakah tambahan penjualan cukup untuk gajinya?",
            type: 2,
          },
        ].map((x) => (
          <Link
            to={`/simulator?template=${x.type}`}
            className="decision-choice"
            key={x.type}
          >
            <x.icon size={25} strokeWidth={1.5} />
            <h3>{x.title}</h3>
            <p>{x.description}</p>
            <span>Coba simulasi</span>
          </Link>
        ))}
      </div>
      <details className="more-decisions">
        <summary>Coba keputusan bisnis lainnya</summary>
        <div className="extra-decisions">
          {extraChoices.map((x, i) => (
            <Link key={x.kind} to={`/simulator?template=${i + 3}`}>
              <x.icon size={18} />
              {x.title}
            </Link>
          ))}
        </div>
      </details>
      <div className="home-next">
        <Link to="/history">
          <TrendingUp size={21} />
          <div>
            <b>Ke mana arah bisnis saya?</b>
            <p>Catat penjualan dan lihat perkiraan dari riwayat.</p>
          </div>
        </Link>
        <Link to="/decisions">
          <ClipboardCheck size={21} />
          <div>
            <b>Bagaimana hasil keputusan saya?</b>
            <p>Bandingkan rencana dengan hasil nyata.</p>
          </div>
        </Link>
      </div>
      {scenarios.length > 0 && (
        <div className="simple-recent">
          <div className="section-title">
            <h2>Simulasi terakhir</h2>
            <Link className="text-link" to="/scenarios">
              Lihat tersimpan
            </Link>
          </div>
          {scenarios.slice(0, 2).map((s) => (
            <Link
              className="scenario-row"
              key={s.id}
              to={`/simulator?id=${s.id}`}
            >
              <div>
                <b>{s.name}</b>
                <small>Buka dan ubah simulasi</small>
              </div>
              <strong>
                {rupiah(simulate(b, s).profit)}
                <small>keuntungan / bulan</small>
              </strong>
            </Link>
          ))}
        </div>
      )}
      <p className="simple-disclaimer">
        Hasil dihitung dari data dan perkiraan Anda. Bukan jaminan pendapatan.
      </p>
    </div>
  );
}
