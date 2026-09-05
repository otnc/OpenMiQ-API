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

<div class="space-y-6">
  <h1 class="text-xl font-semibold">{tr.admin.title}</h1>

  {#if form?.error}
    <p class="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
      {form.error}
    </p>
  {/if}

  <Card.Root>
    <Card.Header>
      <Card.Title>{tr.admin.applications}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3">
      {#each data.applications as app (app.id)}
        <div class="rounded-md border p-3 text-sm">
          <p class="text-muted-foreground font-mono text-xs">{app.id}</p>
          <p class="mt-1">{app.message}</p>
          <div class="mt-2 flex gap-2">
            <form method="POST" action="?/approve" use:enhance>
              <input type="hidden" name="id" value={app.id} />
              <Button type="submit" size="sm">{tr.admin.approve}</Button>
            </form>
            <form method="POST" action="?/deny" use:enhance>
              <input type="hidden" name="id" value={app.id} />
              <Button type="submit" size="sm" variant="destructive"
                >{tr.admin.deny}</Button
              >
            </form>
          </div>
        </div>
      {/each}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>{tr.admin.users}</Card.Title>
    </Card.Header>
    <Card.Content>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Discord</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data.users as user (user.id)}
            <Table.Row>
              <Table.Cell>{user.discordUsername}</Table.Cell>
              <Table.Cell
                ><Badge variant="outline">{user.status}</Badge></Table.Cell
              >
              <Table.Cell class="flex flex-wrap gap-2">
                <form method="POST" action="?/revoke" use:enhance>
                  <input type="hidden" name="id" value={user.id} />
                  <Button type="submit" variant="link" size="sm"
                    >{tr.admin.revoke}</Button
                  >
                </form>
                <form
                  method="POST"
                  action="?/ban"
                  use:enhance
                  class="flex items-center gap-1"
                >
                  <input type="hidden" name="id" value={user.id} />
                  <Input
                    type="text"
                    name="reason"
                    placeholder={tr.admin.reasonLabel}
                    class="h-7 w-32 text-xs"
                  />
                  <Button
                    type="submit"
                    variant="link"
                    size="sm"
                    class="text-destructive">{tr.admin.ban}</Button
                  >
                </form>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>{tr.admin.bans}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-2">
      {#each data.bans as ban (ban.id)}
        <div
          class="flex items-center justify-between rounded-md border p-3 text-sm"
        >
          <span>{ban.discordId} — {ban.reason}</span>
          <form method="POST" action="?/unban" use:enhance>
            <input type="hidden" name="id" value={ban.id} />
            <Button type="submit" variant="link" size="sm"
              >{tr.admin.unban}</Button
            >
          </form>
        </div>
      {/each}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>{tr.admin.auditLog}</Card.Title>
    </Card.Header>
    <Card.Content>
      <ul class="text-muted-foreground space-y-1 text-xs">
        {#each data.auditLog as entry (entry.id)}
          <li>
            {entry.createdAt} — {entry.actorDiscordId}
            {entry.action}
            {entry.targetUserId}
          </li>
        {/each}
      </ul>
    </Card.Content>
  </Card.Root>
</div>
