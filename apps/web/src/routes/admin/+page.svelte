<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import { Input } from "$lib/components/ui/input/index.ts";
  import { Badge } from "$lib/components/ui/badge/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import * as Table from "$lib/components/ui/table/index.ts";
  import Pagination from "$lib/components/Pagination.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { defaultDiscordAvatarUrl } from "$lib/discordAvatar.ts";
  import { formatDuration } from "$lib/duration.ts";
  import { Inbox, Users, Ban, ScrollText, KeyRound } from "@lucide/svelte";
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
  const usernameByUserId = $derived(
    new Map(data.users.map((user) => [user.id, user.discordUsername])),
  );

  // A single shared confirm dialog for every destructive action on this
  // page (revoke/ban/delete-all) — opened with the form that should
  // actually submit once the admin confirms, rather than one dialog
  // instance per row. Ban also collects its (required) reason in the
  // dialog itself instead of a separate table input — the confirm step
  // reads it back out of `reasonValue` and writes it onto the form's own
  // hidden "reason" field just before submitting.
  let confirmOpen = $state(false);
  let pendingForm: HTMLFormElement | null = $state(null);
  let confirmReasonLabel: string | null = $state(null);
  let reasonValue = $state("");

  function confirmThen(
    formEl: HTMLFormElement,
    reasonLabel: string | null = null,
  ) {
    pendingForm = formEl;
    confirmReasonLabel = reasonLabel;
    reasonValue = "";
    confirmOpen = true;
  }

  function submitPending() {
    if (confirmReasonLabel !== null) {
      const reasonInput = pendingForm?.elements.namedItem(
        "reason",
      ) as HTMLInputElement | null;
      if (reasonInput) reasonInput.value = reasonValue;
    }
    pendingForm?.requestSubmit();
    pendingForm = null;
  }

  const PAGE_SIZE = 10;

  let usersPage = $state(1);
  const usersTotalPages = $derived(
    Math.max(1, Math.ceil(data.users.length / PAGE_SIZE)),
  );
  const pagedUsers = $derived(
    data.users.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE),
  );

  let apiKeysPage = $state(1);
  const apiKeysTotalPages = $derived(
    Math.max(1, Math.ceil(data.apiKeys.length / PAGE_SIZE)),
  );
  const pagedApiKeys = $derived(
    data.apiKeys.slice((apiKeysPage - 1) * PAGE_SIZE, apiKeysPage * PAGE_SIZE),
  );
</script>

<div class="space-y-6">
  <h1 class="font-display text-2xl font-semibold">{tr.admin.title}</h1>

  {#if form?.error}
    <p class="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
      {form.error}
    </p>
  {/if}

  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2"
        ><Inbox class="text-muted-foreground size-4" />{tr.admin
          .applications}</Card.Title
      >
    </Card.Header>
    <Card.Content class="space-y-3">
      {#each data.applications as app (app.id)}
        <div class="space-y-3 rounded-md border p-4 text-sm">
          <div class="flex items-center gap-2">
            <img
              src={app.avatarUrl ??
                (app.discordId
                  ? defaultDiscordAvatarUrl(app.discordId)
                  : undefined)}
              alt=""
              class="size-8 shrink-0 rounded-full"
              loading="lazy"
            />
            <div class="flex flex-col">
              <span class="font-medium"
                >{app.discordUsername ?? app.userId}</span
              >
              <span
                class="text-muted-foreground font-mono text-[0.7rem]"
                title={tr.admin.discordIdLabel}
                >{app.discordId ?? app.userId}</span
              >
            </div>
          </div>
          <dl
            class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-xs"
          >
            <dt class="text-muted-foreground">{tr.admin.emailLabel}</dt>
            <dd class="truncate">{app.email ?? "—"}</dd>
            <dt class="text-muted-foreground">{tr.admin.ipLabel}</dt>
            <dd class="font-mono">{app.ip}</dd>
            <dt class="text-muted-foreground">{tr.admin.fingerprintLabel}</dt>
            <dd class="truncate font-mono">{app.fingerprint}</dd>
          </dl>
          <p class="bg-muted rounded-md p-2 text-sm whitespace-pre-wrap">
            {app.message}
          </p>
          <div class="flex gap-2">
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
      <Card.Title class="flex items-center gap-2"
        ><Users class="text-muted-foreground size-4" />{tr.admin
          .users}</Card.Title
      >
    </Card.Header>
    <Card.Content>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>{tr.common.discord}</Table.Head>
            <Table.Head>{tr.common.status}</Table.Head>
            <Table.Head>{tr.admin.maxApiKeysLabel}</Table.Head>
            <Table.Head></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each pagedUsers as user (user.id)}
            <Table.Row>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  <img
                    src={user.avatarUrl ??
                      defaultDiscordAvatarUrl(user.discordId)}
                    alt=""
                    class="size-6 shrink-0 rounded-full"
                    loading="lazy"
                  />
                  <div class="flex flex-col">
                    <span>{user.discordUsername}</span>
                    <span
                      class="text-muted-foreground font-mono text-[0.7rem]"
                      title={tr.admin.discordIdLabel}>{user.discordId}</span
                    >
                    <span
                      class="text-muted-foreground text-[0.7rem]"
                      title={tr.admin.emailLabel}>{user.email}</span
                    >
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>
                <div class="flex flex-wrap items-center gap-1">
                  <Badge variant="outline">{user.status}</Badge>
                  {#if user.reconsentRequired}
                    <Badge variant="destructive"
                      >{tr.common.reconsentPending}</Badge
                    >
                  {/if}
                </div>
              </Table.Cell>
              <Table.Cell>
                <form
                  method="POST"
                  action="?/setMaxApiKeys"
                  use:enhance
                  class="flex items-center gap-1"
                >
                  <input type="hidden" name="id" value={user.id} />
                  <Input
                    type="number"
                    min="0"
                    name="maxApiKeys"
                    value={user.maxApiKeys ?? ""}
                    placeholder={tr.admin.maxApiKeysUnlimited}
                    class="h-7 w-20 text-xs"
                  />
                  <Button type="submit" variant="link" size="sm"
                    >{tr.admin.save}</Button
                  >
                </form>
              </Table.Cell>
              <Table.Cell>
                <div class="flex flex-wrap items-center gap-2">
                  <form method="POST" action="?/revoke" use:enhance>
                    <input type="hidden" name="id" value={user.id} />
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onclick={(event) =>
                        confirmThen(
                          (event.currentTarget as HTMLButtonElement).form!,
                        )}>{tr.admin.revoke}</Button
                    >
                  </form>
                  <form method="POST" action="?/ban" use:enhance>
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="reason" />
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      class="text-destructive"
                      onclick={(event) =>
                        confirmThen(
                          (event.currentTarget as HTMLButtonElement).form!,
                          tr.admin.reasonLabel,
                        )}>{tr.admin.ban}</Button
                    >
                  </form>
                  <form method="POST" action="?/deleteAllApiKeys" use:enhance>
                    <input type="hidden" name="userId" value={user.id} />
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      class="text-destructive"
                      onclick={(event) =>
                        confirmThen(
                          (event.currentTarget as HTMLButtonElement).form!,
                        )}>{tr.admin.deleteAllKeys}</Button
                    >
                  </form>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
      <Pagination
        bind:page={usersPage}
        totalPages={usersTotalPages}
        previousLabel={tr.pagination.previous}
        nextLabel={tr.pagination.next}
        pageOfLabel={tr.pagination.pageOf}
      />
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2"
        ><Ban class="text-muted-foreground size-4" />{tr.admin.bans}</Card.Title
      >
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
      <Card.Title class="flex items-center gap-2"
        ><KeyRound class="text-muted-foreground size-4" />{tr.admin
          .apiKeys}</Card.Title
      >
    </Card.Header>
    <Card.Content>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>{tr.common.discord}</Table.Head>
            <Table.Head>{tr.apiKeys.nameLabel}</Table.Head>
            <Table.Head>{tr.common.prefix}</Table.Head>
            <Table.Head>{tr.common.requests}</Table.Head>
            <Table.Head>{tr.common.usage}</Table.Head>
            <Table.Head></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each pagedApiKeys as key (key.id)}
            <Table.Row>
              <Table.Cell
                >{usernameByUserId.get(key.userId) ?? key.userId}</Table.Cell
              >
              <Table.Cell>{key.name}</Table.Cell>
              <Table.Cell class="font-mono text-xs">{key.keyPrefix}…</Table.Cell
              >
              <Table.Cell class="tabular-nums">{key.requestCount}</Table.Cell>
              <Table.Cell class="tabular-nums">
                {#if key.revokedAt}
                  <Badge variant="destructive">{tr.common.revoked}</Badge>
                {:else}
                  <div class="flex flex-col">
                    <span>{key.limit - key.remaining}/{key.limit}</span>
                    <span class="text-muted-foreground text-xs"
                      >{resetsIn(key.resetAt)}</span
                    >
                  </div>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <div class="flex flex-wrap items-center gap-2">
                  {#if !key.revokedAt}
                    <form method="POST" action="?/revokeApiKey" use:enhance>
                      <input type="hidden" name="id" value={key.id} />
                      <Button type="submit" variant="link" size="sm"
                        >{tr.admin.revokeKey}</Button
                      >
                    </form>
                  {/if}
                  <form method="POST" action="?/deleteApiKey" use:enhance>
                    <input type="hidden" name="id" value={key.id} />
                    <Button
                      type="submit"
                      variant="link"
                      size="sm"
                      class="text-destructive">{tr.admin.deleteKey}</Button
                    >
                  </form>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
      <Pagination
        bind:page={apiKeysPage}
        totalPages={apiKeysTotalPages}
        previousLabel={tr.pagination.previous}
        nextLabel={tr.pagination.next}
        pageOfLabel={tr.pagination.pageOf}
      />
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2"
        ><ScrollText class="text-muted-foreground size-4" />{tr.admin
          .auditLog}</Card.Title
      >
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

<ConfirmDialog
  bind:open={confirmOpen}
  title={tr.admin.confirmTitle}
  description={tr.admin.confirmMessage}
  confirmLabel={tr.admin.confirmYes}
  cancelLabel={tr.admin.confirmCancel}
  reasonLabel={confirmReasonLabel}
  bind:reasonValue
  onConfirm={submitPending}
/>
