<script lang="ts">
  import { DropdownMenu, type WithoutChildren } from "bits-ui";
  import { cn } from "$lib/utils.ts";

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 8,
    align = "end",
    portalProps,
    children,
    ...restProps
  }: WithoutChildren<DropdownMenu.ContentProps> & {
    portalProps?: DropdownMenu.PortalProps;
    children?: DropdownMenu.ContentProps["children"];
  } = $props();
</script>

<DropdownMenu.Portal {...portalProps}>
  <DropdownMenu.Content
    bind:ref
    {sideOffset}
    {align}
    class={cn(
      "bg-popover text-popover-foreground border-border z-50 min-w-40 rounded-md border p-1 shadow-md",
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
  </DropdownMenu.Content>
</DropdownMenu.Portal>
