<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.ts";

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  // The <dialog> element (not open state) is the source of truth for
  // showModal()/close() — this effect just keeps it in sync with `open`
  // however that got toggled (a click here, or the caller setting it).
  $effect(() => {
    if (open) dialogEl?.showModal();
    else dialogEl?.close();
  });
</script>

<dialog
  bind:this={dialogEl}
  onclose={() => (open = false)}
  onclick={(event) => {
    if (event.target === dialogEl) dialogEl?.close();
  }}
  class="bg-card text-card-foreground border-border m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border p-6 shadow-lg backdrop:bg-black/50"
>
  <h2 class="text-base font-semibold">{title}</h2>
  <p class="text-muted-foreground mt-2 text-sm">{description}</p>
  <div class="mt-4 flex justify-end gap-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onclick={() => dialogEl?.close()}>{cancelLabel}</Button
    >
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onclick={() => {
        dialogEl?.close();
        onConfirm();
      }}>{confirmLabel}</Button
    >
  </div>
</dialog>
