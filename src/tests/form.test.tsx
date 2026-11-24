import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { BusinessForm } from "../features/business/BusinessForm";
import { useStore, initialData } from "../lib/storage";
afterEach(cleanup);
describe("business profile form", () => {
  it("validates negative inputs before saving", async () => {
    useStore.getState().commit(initialData());
    render(<BusinessForm />);
    fireEvent.change(screen.getByLabelText("Harga jual rata-rata (Rp)"), {
      target: { value: "-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Simpan Profil/ }));
    await waitFor(() =>
      expect(screen.getByText("Tidak boleh negatif.")).toBeInTheDocument(),
    );
    expect(useStore.getState().data.business.price).toBe(25000);
  });
  it("saves a real business profile", async () => {
    useStore.getState().commit(initialData());
    render(<BusinessForm />);
    fireEvent.change(screen.getByLabelText("Nama bisnis"), {
      target: { value: "Kedai Saya" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Simpan Profil/ }));
    await waitFor(() =>
      expect(useStore.getState().data.business.name).toBe("Kedai Saya"),
    );
    expect(useStore.getState().data.business.demo).toBe(false);
  });
});
