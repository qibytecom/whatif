import { useEffect } from "react";
export function useDialogFocus() {
  useEffect(() => {
    let previous: HTMLElement | null = null;
    let active: HTMLElement | null = null;
    const find = () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog !== active) {
        if (dialog) {
          previous =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          active = dialog;
          requestAnimationFrame(() =>
            dialog.querySelector<HTMLElement>("button,a,input,select")?.focus(),
          );
        } else {
          active = null;
          previous?.focus();
        }
      }
    };
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    find();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !active) return;
      const nodes = Array.from(
        active.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      );
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", trap);
    };
  }, []);
}
