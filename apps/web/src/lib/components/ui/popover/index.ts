import { Popover as PopoverPrimitive } from "bits-ui";
import Content from "./popover-content.svelte";
import Trigger from "./popover-trigger.svelte";

const Root = PopoverPrimitive.Root;

export {
  Root,
  Trigger,
  Content,
  //
  Root as Popover,
  Trigger as PopoverTrigger,
  Content as PopoverContent,
};
