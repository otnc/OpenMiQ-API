<script lang="ts">
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.ts";

  let {
    page = $bindable(1),
    totalPages,
    previousLabel,
    nextLabel,
    pageOfLabel,
  }: {
    page: number;
    totalPages: number;
    previousLabel: string;
    nextLabel: string;
    /** e.g. "Page {page} of {total}" — {page}/{total} are substituted here. */
    pageOfLabel: string;
  } = $props();

  const label = $derived(
    pageOfLabel
      .replace("{page}", String(page))
      .replace("{total}", String(totalPages)),
  );
</script>

{#if totalPages > 1}
  <div class="flex items-center justify-between pt-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={page <= 1}
      onclick={() => (page = Math.max(1, page - 1))}
    >
      <ChevronLeft />
      {previousLabel}
    </Button>
    <span class="text-muted-foreground text-xs">{label}</span>
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={page >= totalPages}
      onclick={() => (page = Math.min(totalPages, page + 1))}
    >
      {nextLabel}
      <ChevronRight />
    </Button>
  </div>
{/if}
