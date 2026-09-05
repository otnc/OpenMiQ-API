<script lang="ts">
  import {
    type DateValue,
    getLocalTimeZone,
    parseDate,
    today,
  } from "@internationalized/date";
  import { CalendarIcon } from "@lucide/svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.ts";
  import * as Popover from "$lib/components/ui/popover/index.ts";
  import { Calendar } from "$lib/components/ui/calendar/index.ts";
  import { cn } from "$lib/utils.ts";

  let {
    value = $bindable(null),
    name,
    placeholder,
    clearLabel = placeholder,
    class: className,
  }: {
    /** Plain ISO date ("YYYY-MM-DD"), or null for "no expiry". */
    value?: string | null;
    name?: string;
    placeholder: string;
    /** Label for the "clear" action in the popover footer. Defaults to `placeholder`. */
    clearLabel?: string;
    class?: string;
  } = $props();

  let open = $state(false);
  const todayValue = today(getLocalTimeZone());
  const dateValue = $derived(value ? parseDate(value) : undefined);

  function onValueChange(next: DateValue | undefined) {
    value = next ? next.toString() : null;
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class={cn(
      buttonVariants({ variant: "outline" }),
      "justify-start font-normal",
      !value && "text-muted-foreground",
      className,
    )}
  >
    <CalendarIcon />
    {value ?? placeholder}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0">
    <Calendar value={dateValue} {onValueChange} minValue={todayValue} />
    <div class="border-border border-t p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="w-full"
        disabled={!value}
        onclick={() => {
          value = null;
          open = false;
        }}>{clearLabel}</Button
      >
    </div>
  </Popover.Content>
</Popover.Root>
{#if name}
  <input type="hidden" {name} value={value ?? ""} />
{/if}
