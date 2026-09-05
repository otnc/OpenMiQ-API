import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import Content from "./dropdown-menu-content.svelte";
import Item from "./dropdown-menu-item.svelte";
import Separator from "./dropdown-menu-separator.svelte";
import Trigger from "./dropdown-menu-trigger.svelte";

const Root = DropdownMenuPrimitive.Root;

export {
  Root,
  Trigger,
  Content,
  Item,
  Separator,
  //
  Root as DropdownMenu,
  Trigger as DropdownMenuTrigger,
  Content as DropdownMenuContent,
  Item as DropdownMenuItem,
  Separator as DropdownMenuSeparator,
};
