<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import { Input } from "$lib/components/ui/input/index.ts";
  import { Badge } from "$lib/components/ui/badge/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import * as Table from "$lib/components/ui/table/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));
</script>

<Card.Root class="mx-auto max-w-2xl">
  <Card.Header>
    <Card.Title>{tr.apiKeys.title}</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-6">
    {#if form?.created}
      <div class="bg-accent rounded-md p-3 text-sm">
        <p class="mb-1">{tr.apiKeys.copyNotice}</p>
        <code class="break-all font-mono text-xs">{form.created}</code>
      </div>
    {/if}
    {#if form?.error}
      <p class="text-destructive text-sm">{form.error}</p>
    {/if}

    <form method="POST" action="?/create" use:enhance class="flex gap-2">
      <Input
        type="text"
        name="name"
        required
        placeholder={tr.apiKeys.nameLabel}
      />
      <Button type="submit">{tr.apiKeys.create}</Button>
    </form>

    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>{tr.apiKeys.nameLabel}</Table.Head>
          <Table.Head>Prefix</Table.Head>
          <Table.Head>{tr.apiKeys.expiresAtLabel}</Table.Head>
          <Table.Head>Requests</Table.Head>
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
            <Table.Cell>{key.requestCount}</Table.Cell>
            <Table.Cell class="flex gap-2">
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
