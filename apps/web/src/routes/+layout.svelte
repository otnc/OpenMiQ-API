<script lang="ts">
  import "../app.css";
  import { t } from "$lib/i18n/index.ts";

  let { data, children } = $props();
  const tr = $derived(t(data.locale));
  let logoFailed = $state(false);
</script>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <header class="border-border bg-card border-b">
    <div
      class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
    >
      <a href="/" class="flex items-center font-semibold">
        {#if !logoFailed}
          <img
            src="/api/branding/logo"
            alt="OpenMiQ-API"
            class="h-6 max-w-40 object-contain"
            onerror={() => (logoFailed = true)}
          />
        {:else}
          OpenMiQ-API
        {/if}
      </a>
      <nav
        class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
      >
        {#if data.me?.status === "approved"}
          <a href="/console/api-keys" class="hover:text-foreground"
            >{tr.nav.console}</a
          >
        {/if}
        {#if data.me}
          <a href="/admin" class="hover:text-foreground">{tr.nav.admin}</a>
        {/if}
      </nav>
    </div>
  </header>
  {#if data.me?.reconsentRequired}
    <div
      class="bg-destructive/10 text-destructive px-4 py-2 text-center text-sm"
    >
      {tr.home.reconsentRequired}
      <a href="/console/reconsent" class="ml-2 font-medium underline"
        >{tr.home.reconsentCta}</a
      >
    </div>
  {/if}
  <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
    {@render children()}
  </main>
  <footer class="border-border bg-card border-t">
    <div
      class="text-muted-foreground mx-auto max-w-3xl space-y-2 px-4 py-6 text-sm"
    >
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <a href="/legal/terms" class="hover:text-foreground"
          >{tr.footer.terms}</a
        >
        <a href="/legal/privacy" class="hover:text-foreground"
          >{tr.footer.privacy}</a
        >
        <a
          href="https://github.com/otnc/OpenMiQ-API"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground">{tr.footer.sourceCode}</a
        >
      </div>
      <p>{tr.footer.attribution}</p>
    </div>
  </footer>
</div>
