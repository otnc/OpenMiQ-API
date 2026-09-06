<script lang="ts">
  import { Info } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  let {
    label,
    children,
  }: {
    label: string;
    children: Snippet;
  } = $props();
</script>

<!-- GitHub's `> [!NOTE]` callout, translated to this app's own palette instead of GitHub's blue. -->
<div
  class="border-primary bg-primary/5 text-foreground rounded-md border-l-4 py-3 pr-3 pl-4 text-sm"
>
  <p class="text-primary mb-1 flex items-center gap-1.5 font-semibold">
    <Info class="size-4" />
    {label}
  </p>
  {@render children()}
</div>
