<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { t } from "$lib/i18n/index.ts";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import LanguageMenu from "$lib/components/LanguageMenu.svelte";
  import UserMenu from "$lib/components/UserMenu.svelte";

  let { data, children } = $props();
  const tr = $derived(t(data.locale));
  let logoFailed = $state(false);

  // The sample quote (generated once at startup from the first ADMIN_DISCORD_IDS entry's avatar, GET /api/sample-quote) doubles as the OGP image — link previews (Discord, Slack, X/Twitter, etc.) show it instead of a generic favicon.
  // Falls through to a 404 with no image if generation never ran (no admin configured); nothing else here degrades.
  const ogImageUrl = $derived(`${data.siteUrl}/api/sample-quote`);
  const ogUrl = $derived(`${data.siteUrl}${page.url.pathname}`);
</script>

<svelte:head>
  <title>OpenMiQ-API</title>
  <meta name="description" content={tr.meta.description} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OpenMiQ-API" />
  <meta property="og:title" content="OpenMiQ-API" />
  <meta property="og:description" content={tr.meta.description} />
  <meta property="og:url" content={ogUrl} />
  <meta property="og:image" content={ogImageUrl} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="OpenMiQ-API" />
  <meta name="twitter:description" content={tr.meta.description} />
  <meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <header
    class="border-border bg-card/80 sticky top-0 z-10 border-b backdrop-blur-sm"
  >
    <div
      class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
    >
      <a href="/" class="font-display flex items-center text-lg font-semibold">
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
        <ThemeToggle labels={tr.theme} />
        <LanguageMenu current={data.locale} label={tr.language.label} />
        {#if data.me}
          <UserMenu
            me={data.me}
            consoleLabel={tr.nav.console}
            adminLabel={tr.nav.admin}
            logoutLabel={tr.nav.logout}
          />
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
        <a href="/playground" class="hover:text-foreground"
          >{tr.playground.title}</a
        >
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground">{tr.common.apiDocs}</a
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
