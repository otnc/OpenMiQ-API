<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));
</script>

<h1 class="mb-6 text-xl font-semibold">{tr.admin.title}</h1>

{#if form?.error}
  <p class="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{form.error}</p>
{/if}

<section class="mb-8">
  <h2 class="mb-2 font-medium">{tr.admin.applications}</h2>
  <ul class="space-y-2">
    {#each data.applications as app (app.id)}
      <li class="rounded border border-neutral-200 p-3 text-sm">
        <p class="font-mono text-xs text-neutral-500">{app.id}</p>
        <p>{app.message}</p>
        <div class="mt-2 flex gap-2">
          <form method="POST" action="?/approve" use:enhance>
            <input type="hidden" name="id" value={app.id} />
            <button class="rounded bg-green-600 px-3 py-1 text-white"
              >{tr.admin.approve}</button
            >
          </form>
          <form method="POST" action="?/deny" use:enhance>
            <input type="hidden" name="id" value={app.id} />
            <button class="rounded bg-red-600 px-3 py-1 text-white"
              >{tr.admin.deny}</button
            >
          </form>
        </div>
      </li>
    {/each}
  </ul>
</section>

<section class="mb-8">
  <h2 class="mb-2 font-medium">{tr.admin.users}</h2>
  <table class="w-full text-left text-sm">
    <thead>
      <tr class="border-b border-neutral-200">
        <th class="py-2">Discord</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each data.users as user (user.id)}
        <tr class="border-b border-neutral-100">
          <td class="py-2">{user.discordUsername}</td>
          <td>{user.status}</td>
          <td class="flex gap-2 py-2">
            <form method="POST" action="?/revoke" use:enhance>
              <input type="hidden" name="id" value={user.id} />
              <button class="text-orange-600 hover:underline"
                >{tr.admin.revoke}</button
              >
            </form>
            <form
              method="POST"
              action="?/ban"
              use:enhance
              class="flex items-center gap-1"
            >
              <input type="hidden" name="id" value={user.id} />
              <input
                type="text"
                name="reason"
                placeholder={tr.admin.reasonLabel}
                class="w-32 rounded border border-neutral-300 px-1 text-xs"
              />
              <button class="text-red-600 hover:underline"
                >{tr.admin.ban}</button
              >
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<section class="mb-8">
  <h2 class="mb-2 font-medium">{tr.admin.bans}</h2>
  <ul class="space-y-2">
    {#each data.bans as ban (ban.id)}
      <li
        class="flex items-center justify-between rounded border border-neutral-200 p-3 text-sm"
      >
        <span>{ban.discordId} — {ban.reason}</span>
        <form method="POST" action="?/unban" use:enhance>
          <input type="hidden" name="id" value={ban.id} />
          <button class="text-blue-600 hover:underline">{tr.admin.unban}</button
          >
        </form>
      </li>
    {/each}
  </ul>
</section>

<section>
  <h2 class="mb-2 font-medium">{tr.admin.auditLog}</h2>
  <ul class="space-y-1 text-xs text-neutral-600">
    {#each data.auditLog as entry (entry.id)}
      <li>
        {entry.createdAt} — {entry.actorDiscordId}
        {entry.action}
        {entry.targetUserId}
      </li>
    {/each}
  </ul>
</section>
