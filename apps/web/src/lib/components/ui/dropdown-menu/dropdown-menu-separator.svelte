<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import { cn } from "$lib/utils.ts";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DropdownMenu.SeparatorProps = $props();
</script>

<DropdownMenu.Separator
  bind:ref
  class={cn("bg-border -mx-1 my-1 h-px", className)}
  {...restProps}
/>
