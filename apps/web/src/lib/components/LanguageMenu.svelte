<script lang="ts">
  import { page } from "$app/state";
  import { Languages } from "@lucide/svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.ts";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.ts";
  import { SUPPORTED_LOCALES, type Locale } from "$lib/i18n/index.ts";
  import { cn } from "$lib/utils.ts";

  let { current, label }: { current: Locale; label: string } = $props();

  const NAMES: Record<Locale, string> = { en: "English", ja: "日本語" };

  function hrefFor(locale: Locale): string {
    return `/locale/${locale}?redirect=${encodeURIComponent(page.url.pathname)}`;
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class={buttonVariants({ variant: "ghost", size: "icon-sm" })}
    title={label}
    aria-label={label}
  >
    <Languages />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    {#each SUPPORTED_LOCALES as locale (locale)}
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <a
            {...props}
            href={hrefFor(locale)}
            aria-current={locale === current ? "true" : undefined}
            class={cn(
              props.class as string,
              locale === current && "font-semibold",
            )}
          >
            {NAMES[locale]}
          </a>
        {/snippet}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
