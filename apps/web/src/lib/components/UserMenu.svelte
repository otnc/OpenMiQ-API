<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.ts";
  import { defaultDiscordAvatarUrl } from "$lib/discordAvatar.ts";
  import type { ConsoleMe } from "../../routes/+layout.server.ts";

  let {
    me,
    consoleLabel,
    adminLabel,
    logoutLabel,
  }: {
    me: ConsoleMe;
    consoleLabel: string;
    adminLabel: string;
    logoutLabel: string;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
    aria-label={me.discordUsername}
  >
    <img
      src={me.avatarUrl ?? defaultDiscordAvatarUrl(me.discordId)}
      alt=""
      class="size-7 rounded-full"
    />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    {#if me.status === "approved"}
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <a {...props} href="/console/api-keys">{consoleLabel}</a>
        {/snippet}
      </DropdownMenu.Item>
    {/if}
    {#if me.isAdmin}
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <a {...props} href="/admin">{adminLabel}</a>
        {/snippet}
      </DropdownMenu.Item>
    {/if}
    <DropdownMenu.Separator />
    <form method="POST" action="/api/auth/logout">
      <button
        type="submit"
        class="hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
      >
        {logoutLabel}
      </button>
    </form>
  </DropdownMenu.Content>
</DropdownMenu.Root>
