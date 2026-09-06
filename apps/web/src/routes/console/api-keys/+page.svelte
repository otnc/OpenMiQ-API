<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import { Input } from "$lib/components/ui/input/index.ts";
  import { Badge } from "$lib/components/ui/badge/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import * as Table from "$lib/components/ui/table/index.ts";
  import { Copy, Check } from "@lucide/svelte";
  import DatePicker from "$lib/components/DatePicker.svelte";
  import { formatDuration } from "$lib/duration.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));

  function resetsIn(resetAt: string): string {
    const duration = formatDuration(new Date(resetAt).getTime() - Date.now(), {
      day: tr.common.unitDay,
      hour: tr.common.unitHour,
      minute: tr.common.unitMinute,
    });
    return tr.common.resetsIn.replace("{duration}", duration);
  }

  let expiresAt: string | null = $state(null);
  let copied = $state(false);

  async function copyCreatedKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard access denied/unavailable — the key is still selectable
      // as plain text, so this is a lost convenience, not a lost key.
    }
  }
</script>

<Card.Root class="mx-auto max-w-2xl">
  <Card.Header>
    <Card.Title>{tr.apiKeys.title}</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-6">
    <a
      href="/api/docs"
      target="_blank"
      rel="noopener noreferrer"
      class="text-muted-foreground hover:text-foreground text-sm underline"
    >
      {tr.common.apiDocs}
    </a>
    {#if form?.created}
      <div class="bg-accent rounded-md p-3 text-sm">
        <p class="mb-1">{tr.apiKeys.copyNotice}</p>
        <div class="flex items-center gap-2">
          <code class="break-all font-mono text-xs">{form.created}</code>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            class="shrink-0"
            onclick={() => copyCreatedKey(form.created!)}
            title={tr.apiKeys.copy}
            aria-label={tr.apiKeys.copy}
          >
            {#if copied}
              <Check />
            {:else}
              <Copy />
            {/if}
          </Button>
        </div>
      </div>
    {/if}
    {#if form?.error}
      <p class="text-destructive text-sm">{form.error}</p>
    {/if}

    <form
      method="POST"
      action="?/create"
      use:enhance
      class="flex flex-wrap gap-2"
    >
      <Input
        type="text"
        name="name"
        required
        placeholder={tr.apiKeys.nameLabel}
        class="min-w-40 flex-1"
      />
      <DatePicker
        bind:value={expiresAt}
        name="expiresAt"
        placeholder={tr.apiKeys.noExpiry}
      />
      <Button type="submit">{tr.apiKeys.create}</Button>
    </form>

    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>{tr.apiKeys.nameLabel}</Table.Head>
          <Table.Head>{tr.common.prefix}</Table.Head>
          <Table.Head>{tr.apiKeys.expiresAtLabel}</Table.Head>
          <Table.Head>{tr.common.usage}</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each data.keys as key (key.id)}
          <Table.Row>
            <Table.Cell>{key.name}</Table.Cell>
            <Table.Cell class="font-mono text-xs">{key.keyPrefix}…</Table.Cell>
            <Table.Cell>
              {#if key.expiresAt}
                {key.expiresAt}
              {:else}
                <Badge variant="secondary">{tr.apiKeys.noExpiry}</Badge>
              {/if}
            </Table.Cell>
            <Table.Cell class="tabular-nums">
              <div class="flex flex-col">
                <span>{key.limit - key.remaining}/{key.limit}</span>
                <span class="text-muted-foreground text-xs"
                  >{resetsIn(key.resetAt)}</span
                >
              </div>
            </Table.Cell>
            <Table.Cell>
              <div class="flex flex-wrap items-center gap-2">
                <form method="POST" action="?/regenerate" use:enhance>
                  <input type="hidden" name="id" value={key.id} />
                  <Button type="submit" variant="link" size="sm"
                    >{tr.apiKeys.regenerate}</Button
                  >
                </form>
                <form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={key.id} />
                  <Button
                    type="submit"
                    variant="link"
                    size="sm"
                    class="text-destructive"
                  >
                    {tr.apiKeys.delete}
                  </Button>
                </form>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

    {#if data.keys.length > 0}
      <form method="POST" action="?/deleteAll" use:enhance>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          class="text-destructive"
        >
          {tr.apiKeys.deleteAll}
        </Button>
      </form>
    {/if}
  </Card.Content>
</Card.Root>
