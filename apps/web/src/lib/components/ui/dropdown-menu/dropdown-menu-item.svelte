<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import { cn } from "$lib/utils.ts";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DropdownMenu.ItemProps = $props();
</script>

<DropdownMenu.Item
  bind:ref
  class={cn(
    "hover:bg-accent hover:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none [&_svg]:size-4 [&_svg]:shrink-0",
    className,
  )}
  {...restProps}
/>
