import type { Locale } from "$lib/i18n";

declare global {
  namespace App {
    interface Locals {
      locale: Locale;
      cookie: string | null;
    }
  }
}

export {};
