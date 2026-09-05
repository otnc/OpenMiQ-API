<script lang="ts">
  import { Popover, type WithoutChildren } from "bits-ui";
  import { cn } from "$lib/utils.ts";

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 8,
    align = "start",
    portalProps,
    children,
    ...restProps
  }: WithoutChildren<Popover.ContentProps> & {
    portalProps?: Popover.PortalProps;
    children?: Popover.ContentProps["children"];
  } = $props();
</script>

<Popover.Portal {...portalProps}>
  <Popover.Content
    bind:ref
    {sideOffset}
    {align}
    class={cn(
      "bg-popover text-popover-foreground border-border z-50 rounded-md border shadow-md outline-none",
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
  </Popover.Content>
</Popover.Portal>
