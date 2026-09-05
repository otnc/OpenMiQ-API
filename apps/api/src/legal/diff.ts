import { diffWords } from "diff";
import type { Locale, LocalizedText } from "./content.ts";

export interface LegalDiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

export interface LegalDiffResult {
  fromVersion: string;
  toVersion: string;
  // false when `fromVersion` has no stored text to diff against (e.g. it
  // predates version history) — callers should fall back to full text.
  available: boolean;
  parts: LegalDiffPart[];
}

export function diffVersions(
  versions: Record<string, LocalizedText>,
  fromVersion: string,
  toVersion: string,
  lang: Locale,
): LegalDiffResult {
  const from = versions[fromVersion];
  const to = versions[toVersion];
  if (!from || !to) {
    return { fromVersion, toVersion, available: false, parts: [] };
  }
  if (fromVersion === toVersion) {
    return {
      fromVersion,
      toVersion,
      available: true,
      parts: [{ value: to[lang], added: false, removed: false }],
    };
  }

  const parts = diffWords(from[lang], to[lang]).map((change) => ({
    value: change.value,
    added: change.added ?? false,
    removed: change.removed ?? false,
  }));
  return { fromVersion, toVersion, available: true, parts };
}
