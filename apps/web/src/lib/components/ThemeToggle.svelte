<script lang="ts">
  import { Sun, Moon, Monitor } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.ts";
  import { themeStore, type ThemePreference } from "$lib/theme.svelte.ts";

  const ORDER: ThemePreference[] = ["system", "light", "dark"];
  const ICONS = { system: Monitor, light: Sun, dark: Moon };

  let { labels }: { labels: Record<ThemePreference, string> } = $props();

  function cycle() {
    const next =
      ORDER[(ORDER.indexOf(themeStore.preference) + 1) % ORDER.length]!;
    themeStore.set(next);
  }
</script>

<Button
  type="button"
  variant="ghost"
  size="icon-sm"
  onclick={cycle}
  title={labels[themeStore.preference]}
  aria-label={labels[themeStore.preference]}
>
  {@const Icon = ICONS[themeStore.preference]}
  <Icon />
</Button>
