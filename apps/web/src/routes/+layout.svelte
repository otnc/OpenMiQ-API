<script lang="ts">
  import "../app.css";
  import { t } from "$lib/i18n/index.ts";

  let { data, children } = $props();
  const tr = $derived(t(data.locale));
</script>

<div class="bg-background text-foreground min-h-screen">
  <header class="border-border bg-card border-b">
    <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
      <a href="/" class="font-semibold">OpenMiQ-API</a>
      <nav class="text-muted-foreground flex items-center gap-4 text-sm">
        {#if data.me?.status === "approved"}
          <a href="/console/api-keys" class="hover:text-foreground"
            >{tr.nav.console}</a
          >
        {/if}
        <a href="/admin" class="hover:text-foreground">{tr.nav.admin}</a>
      </nav>
    </div>
  </header>
  <main class="mx-auto max-w-3xl px-4 py-8">
    {@render children()}
  </main>
</div>
