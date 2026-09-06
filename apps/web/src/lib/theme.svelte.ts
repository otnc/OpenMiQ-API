export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "openmiq-theme";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function readStored(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  } catch {
    return "system";
  }
}

function applyToDocument(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const dark =
    preference === "dark" || (preference === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

// A tiny rune-backed store rather than a context — the toggle in +layout.svelte and any other page that wants to read/set the theme all share this one module-level instance, no provider needed.
class ThemeStore {
  preference = $state<ThemePreference>(readStored());

  constructor() {
    // app.html's own inline script already applied the pre-hydration value to <html> to avoid a flash; this just keeps the two in sync and reacts to the OS theme changing while "system" is selected.
    if (typeof window !== "undefined") {
      applyToDocument(this.preference);
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (this.preference === "system") applyToDocument("system");
        });
    }
  }

  set(preference: ThemePreference): void {
    this.preference = preference;
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Private browsing / storage disabled — the choice just won't persist.
    }
    applyToDocument(preference);
  }
}

export const themeStore = new ThemeStore();
