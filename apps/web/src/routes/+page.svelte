<script lang="ts">
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";

  let { data } = $props();
  const tr = $derived(t(data.locale));
</script>

<Card.Root class="mx-auto max-w-md">
  <Card.Header>
    <Card.Title>OpenMiQ-API</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-4">
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
