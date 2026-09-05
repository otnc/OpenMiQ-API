<script lang="ts">
  import { t } from "$lib/i18n/index.ts";

  let { data } = $props();
  const tr = $derived(t(data.locale));
</script>

<div class="space-y-4">
  {#if !data.me}
    <p>{tr.home.unlinked}</p>
    <a
      href="/api/auth/discord"
      class="inline-block rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
    >
      {tr.home.unlinkedCta}
    </a>
  {:else if data.me.status === "unlinked"}
    <p>{tr.home.unlinked}</p>
    <a
      href="/console/apply"
      class="inline-block rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
    >
      {tr.apply.title}
    </a>
  {:else if data.me.status === "pending"}
    <p>{tr.home.pending}</p>
  {:else if data.me.status === "approved"}
    <p>{tr.home.approved}</p>
    <a
      href="/console/api-keys"
      class="inline-block rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
    >
      {tr.home.approvedCta}
    </a>
  {:else if data.me.status === "denied"}
    <p>{tr.home.denied}</p>
    <a
      href="/console/apply"
      class="inline-block rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
    >
      {tr.apply.title}
    </a>
  {:else if data.me.status === "revoked"}
    <p>{tr.home.revoked}</p>
    <a
      href="/console/apply"
      class="inline-block rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
    >
      {tr.apply.title}
    </a>
  {:else if data.me.status === "banned"}
    <p class="text-red-600">{tr.home.banned}</p>
  {/if}
</div>
