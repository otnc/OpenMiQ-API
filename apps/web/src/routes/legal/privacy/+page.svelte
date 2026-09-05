<script lang="ts">
  import { t } from "$lib/i18n/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import type { PageData } from "./$types.ts";

  let { data }: { data: PageData } = $props();
  const tr = $derived(t(data.locale));
</script>

<svelte:head>
  <title>{tr.legal.privacyTitle} — OpenMiQ-API</title>
</svelte:head>

<Card.Root class="mx-auto max-w-2xl">
  <Card.Header>
    <Card.Title>{tr.legal.privacyTitle}</Card.Title>
  </Card.Header>
  <Card.Content>
    {#if data.doc}
      <pre
        class="text-foreground/90 whitespace-pre-wrap break-words text-sm">{data
          .doc.content}</pre>
    {/if}
  </Card.Content>
</Card.Root>
