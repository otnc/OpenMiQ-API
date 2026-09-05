<script lang="ts">
  import { Calendar as CalendarPrimitive } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import { cn } from "$lib/utils.ts";
  import { buttonVariants } from "$lib/components/ui/button/index.ts";

  // A single-date-only wrapper — the app never needs multi-select, and
  // bits-ui's own CalendarRootProps is a single|multiple union too complex
  // for svelte-check to narrow through a plain pass-through prop type.
  let {
    ref = $bindable(null),
    value = $bindable<DateValue | undefined>(),
    placeholder = $bindable<DateValue | undefined>(),
    class: className,
    weekdayFormat = "short",
    minValue,
    maxValue,
    onValueChange,
  }: {
    ref?: HTMLElement | null;
    value?: DateValue;
    placeholder?: DateValue;
    class?: string;
    weekdayFormat?: Intl.DateTimeFormatOptions["weekday"];
    minValue?: DateValue;
    maxValue?: DateValue;
    onValueChange?: (value: DateValue | undefined) => void;
  } = $props();
</script>

<CalendarPrimitive.Root
  bind:ref
  bind:value
  bind:placeholder
  type="single"
  {weekdayFormat}
  {minValue}
  {maxValue}
  {onValueChange}
  class={cn("p-3", className)}
>
  {#snippet children({ months, weekdays })}
    <CalendarPrimitive.Header class="flex items-center justify-between pb-2">
      <CalendarPrimitive.PrevButton
        class={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <ChevronLeft />
      </CalendarPrimitive.PrevButton>
      <CalendarPrimitive.Heading class="text-sm font-medium" />
      <CalendarPrimitive.NextButton
        class={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <ChevronRight />
      </CalendarPrimitive.NextButton>
    </CalendarPrimitive.Header>
    {#each months as month (month.value)}
      <CalendarPrimitive.Grid class="w-full border-collapse space-y-1">
        <CalendarPrimitive.GridHead>
          <CalendarPrimitive.GridRow class="flex">
            {#each weekdays as weekday (weekday)}
              <CalendarPrimitive.HeadCell
                class="text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal"
              >
                {weekday}
              </CalendarPrimitive.HeadCell>
            {/each}
          </CalendarPrimitive.GridRow>
        </CalendarPrimitive.GridHead>
        <CalendarPrimitive.GridBody>
          {#each month.weeks as weekDates (weekDates)}
            <CalendarPrimitive.GridRow class="mt-1 flex w-full">
              {#each weekDates as date (date)}
                <CalendarPrimitive.Cell
                  {date}
                  month={month.value}
                  class="relative size-9 p-0 text-center text-sm"
                >
                  <CalendarPrimitive.Day
                    class="hover:bg-accent hover:text-accent-foreground data-selected:bg-primary data-selected:text-primary-foreground data-today:border-border data-disabled:text-muted-foreground data-outside-month:text-muted-foreground data-disabled:pointer-events-none data-disabled:opacity-50 inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sm font-normal whitespace-nowrap"
                  />
                </CalendarPrimitive.Cell>
              {/each}
            </CalendarPrimitive.GridRow>
          {/each}
        </CalendarPrimitive.GridBody>
      </CalendarPrimitive.Grid>
    {/each}
  {/snippet}
</CalendarPrimitive.Root>
