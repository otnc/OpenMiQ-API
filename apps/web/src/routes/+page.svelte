<script lang="ts">
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import NoteCallout from "$lib/components/NoteCallout.svelte";

  let { data } = $props();
  const tr = $derived(t(data.locale));
  let sampleQuoteFailed = $state(false);
</script>

<div class="space-y-8">
  {#if !sampleQuoteFailed}
    <img
      src="/api/sample-quote"
      alt={tr.home.sampleAlt}
      class="mx-auto max-h-80 max-w-full rounded-lg shadow-sm"
      onerror={() => (sampleQuoteFailed = true)}
    />
  {/if}

  {#if data.discordInviteUrl}
    <div class="mx-auto max-w-md">
      <NoteCallout label={tr.common.noteLabel}>
        <p>
          {tr.common.discordInviteMessage}
          <a
            href={data.discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary font-medium underline"
            >{tr.common.discordInviteCta}</a
          >
        </p>
      </NoteCallout>
    </div>
  {/if}

  <div class="mx-auto max-w-md">
    <NoteCallout label={tr.common.noteLabel}>
      <p>{tr.common.npmPackageMessage}</p>
      <code
        class="bg-foreground/5 mt-1 mb-1.5 block w-fit rounded px-2 py-1 text-xs"
        >npm install &commat;makeitaquote/openmiq</code
      >
      <p class="space-x-2">
        <a
          href="https://www.npmjs.com/package/@makeitaquote/openmiq"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary font-medium underline">npm</a
        >
        <a
          href="https://github.com/otnc/OpenMiQ-API/tree/main/packages/openmiq"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary font-medium underline">GitHub</a
        >
      </p>
    </NoteCallout>
  </div>

  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title>OpenMiQ-API</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <a
        href="/api/docs"
        target="_blank"
        rel="noopener noreferrer"
        class="text-muted-foreground hover:text-foreground text-sm underline"
      >
        {tr.common.apiDocs}
      </a>
      {#if !data.me}
        <p class="text-muted-foreground">{tr.home.unlinked}</p>
        <Button href="/api/auth/discord">{tr.home.unlinkedCta}</Button>
      {:else if data.me.status === "unlinked"}
        <p class="text-muted-foreground">{tr.home.unlinked}</p>
        <Button href="/console/apply">{tr.apply.title}</Button>
      {:else if data.me.status === "pending"}
        <p class="text-muted-foreground">{tr.home.pending}</p>
      {:else if data.me.status === "approved"}
        <p class="text-muted-foreground">{tr.home.approved}</p>
        <Button href="/console/api-keys">{tr.home.approvedCta}</Button>
      {:else if data.me.status === "denied"}
        <p class="text-muted-foreground">{tr.home.denied}</p>
        <Button href="/console/apply">{tr.apply.title}</Button>
      {:else if data.me.status === "revoked"}
        <p class="text-muted-foreground">{tr.home.revoked}</p>
        <Button href="/console/apply">{tr.apply.title}</Button>
      {:else if data.me.status === "banned"}
        <p class="text-destructive">{tr.home.banned}</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title>{tr.home.creditsTitle}</Card.Title>
    </Card.Header>
    <Card.Content class="text-muted-foreground space-y-2 text-sm">
      <p>
        <a
          href="https://github.com/otnc/OpenMiQ-API"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground underline">OpenMiQ-API</a
        > — this Web API, and the source you're looking at right now.
      </p>
      <p>
        <a
          href="https://github.com/otnc/OpenMiQ"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground underline">OpenMiQ</a
        >
        — this API is based on OpenMiQ (a Discord bot) by
        <strong>otoneko.</strong>, with modifications to expose it as a Web API.
      </p>
      <p>
        <a
          href="https://github.com/otnc/makeitaquote"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground underline">makeitaquote</a
        >
        — the library this API renders images with.
      </p>
      <p>
        Make it a Quote —
        <a
          href="https://twitter.com/MakeItAQuote"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground underline">Twitter</a
        >
        /
        <a
          href="https://miq.moe/"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground underline">Discord/Misskey/Bluesky</a
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
