import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Locale = "en" | "ja";
export type LocalizedText = Record<Locale, string>;

// The full text of every published version is kept (not just the current
// one) so a user re-agreeing after a TERMS_VERSION/PRIVACY_VERSION bump can
// be shown a diff against the version they last agreed to, not just the new
// text on its own (DESIGN.md §16.4). Each version lives as its own set of
// Markdown files under apps/api/legal/<doc>/<version>/, read relative to the
// process working directory (apps/api, per ecosystem.config.cjs and the dev
// script) rather than bundled, so new versions can be added without a build.
const LEGAL_DIR = join(process.cwd(), "legal");

function loadVersions(
  doc: "terms" | "privacy",
  baseName: string,
): Record<string, LocalizedText> {
  const dir = join(LEGAL_DIR, doc);
  const versions: Record<string, LocalizedText> = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const version = entry.name;
    versions[version] = {
      en: readFileSync(join(dir, version, `${baseName}.md`), "utf-8").trimEnd(),
      ja: readFileSync(
        join(dir, version, `${baseName}-ja.md`),
        "utf-8",
      ).trimEnd(),
    };
  }
  return versions;
}

export const termsVersions: Record<string, LocalizedText> = loadVersions(
  "terms",
  "TERMS",
);
export const privacyVersions: Record<string, LocalizedText> = loadVersions(
  "privacy",
  "PRIVACY",
);
