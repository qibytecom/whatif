import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Shell } from "../components/layout/Shell";
import Dashboard from "../pages/Dashboard";
import Simulator from "../pages/Simulator";
import Scenarios from "../pages/Scenarios";
import Insights from "../pages/Insights";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import History from "../pages/History";
import Decisions from "../pages/Decisions";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route path="insights" element={<Insights />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="history" element={<History />} />
          <Route path="decisions" element={<Decisions />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Halaman tidak ditemukan</h1>
                <Link to="/">Kembali ke Dashboard</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
