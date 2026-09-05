<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));
</script>

<h1 class="mb-4 text-xl font-semibold">{tr.apiKeys.title}</h1>

{#if form?.created}
  <p class="mb-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
    {tr.apiKeys.copyNotice}<br />
    <code class="break-all font-mono">{form.created}</code>
  </p>
{/if}
{#if form?.error}
  <p class="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{form.error}</p>
{/if}

<form method="POST" action="?/create" use:enhance class="mb-6 flex gap-2">
  <input
    type="text"
    name="name"
    required
    placeholder={tr.apiKeys.nameLabel}
    class="flex-1 rounded border border-neutral-300 px-3 py-2"
  />
  <button
    type="submit"
    class="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
  >
    {tr.apiKeys.create}
  </button>
</form>

<table class="w-full text-left text-sm">
  <thead>
    <tr class="border-b border-neutral-200">
      <th class="py-2">{tr.apiKeys.nameLabel}</th>
      <th>Prefix</th>
      <th>{tr.apiKeys.expiresAtLabel}</th>
      <th>Requests</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {#each data.keys as key (key.id)}
      <tr class="border-b border-neutral-100">
        <td class="py-2">{key.name}</td>
        <td class="font-mono text-xs">{key.keyPrefix}…</td>
        <td>{key.expiresAt ?? tr.apiKeys.noExpiry}</td>
        <td>{key.requestCount}</td>
        <td class="flex gap-2 py-2">
          <form method="POST" action="?/regenerate" use:enhance>
            <input type="hidden" name="id" value={key.id} />
            <button type="submit" class="text-blue-600 hover:underline"
              >{tr.apiKeys.regenerate}</button
            >
          </form>
          <form method="POST" action="?/delete" use:enhance>
            <input type="hidden" name="id" value={key.id} />
            <button type="submit" class="text-red-600 hover:underline"
              >{tr.apiKeys.delete}</button
            >
          </form>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if data.keys.length > 0}
  <form method="POST" action="?/deleteAll" use:enhance class="mt-4">
    <button type="submit" class="text-sm text-red-600 hover:underline"
      >{tr.apiKeys.deleteAll}</button
    >
  </form>
{/if}
