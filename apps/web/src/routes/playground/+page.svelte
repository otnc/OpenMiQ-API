<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import { Input } from "$lib/components/ui/input/index.ts";
  import { Label } from "$lib/components/ui/label/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));

  const API_KEY_STORAGE_KEY = "openmiq-playground-api-key";

  let apiKey = $state("");
  // Loaded/persisted client-side only — the server action forwards it to /api/quote per request and never writes it anywhere itself.
  $effect(() => {
    try {
      apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
    } catch {
      // Private browsing / storage disabled — the field just starts empty.
    }
  });
  $effect(() => {
    try {
      if (apiKey) localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      else localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      // Same as above — nothing to persist to.
    }
  });

  let text = $state("Hello, world!");
  let authorName = $state("otoneko.");
  let theme = $state("");
  let font = $state("");
  let layout = $state<"default" | "side" | "new">("default");
  let color = $state(false);
  let bold = $state(false);
  let fake = $state(false);
  let sending = $state(false);

  type AvatarMode = "url" | "upload";
  let avatarMode = $state<AvatarMode>("url");
  let authorAvatarUrl = $state("");
  let authorAvatarRaw = $state<string | null>(null);
  let avatarFileName = $state("");

  type WatermarkMode = "default" | "text" | "url" | "upload";
  let watermarkMode = $state<WatermarkMode>("default");
  let watermark = $state("");
  let watermarkUrl = $state("");
  let watermarkRaw = $state<string | null>(null);
  let watermarkFileName = $state("");

  // FileReader, not an arrayBuffer()+btoa() chunking dance — readAsDataURL() already base64-encodes for us; the part after the comma is exactly what authorAvatarRaw/watermarkRaw want on the wire.
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function onAvatarFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    avatarFileName = file.name;
    authorAvatarRaw = await fileToBase64(file);
  }

  async function onWatermarkFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    watermarkFileName = file.name;
    watermarkRaw = await fileToBase64(file);
  }

  // Mirrors apps/api's own buildPayload() (packages/openmiq/src/payload.ts) — every optional field is left out entirely rather than sent empty, the same rule @makeitaquote/openmiq's builder follows.
  // No `hosted` option here: the playground never asks for it (+page.server.ts strips it even if it somehow arrived) — see that file's comment for why.
  const requestBody = $derived.by(() => {
    const options: Record<string, unknown> = {};
    if (color) options.color = true;
    if (bold) options.bold = true;
    if (layout !== "default") options.layout = layout;

    const body: Record<string, unknown> = { authorName, text };
    if (avatarMode === "upload" && authorAvatarRaw) {
      body.authorAvatarRaw = authorAvatarRaw;
    } else if (avatarMode === "url" && authorAvatarUrl) {
      body.authorAvatarUrl = authorAvatarUrl;
    }
    if (theme) body.theme = theme;
    if (font) body.font = font;
    if (watermarkMode === "text") body.watermark = watermark;
    else if (watermarkMode === "url" && watermarkUrl) {
      body.watermarkUrl = watermarkUrl;
    } else if (watermarkMode === "upload" && watermarkRaw) {
      body.watermarkRaw = watermarkRaw;
    }
    if (Object.keys(options).length > 0) body.options = options;
    return body;
  });

  // The actual request — sent as-is, raw image bytes included in full.
  const requestJson = $derived(JSON.stringify(requestBody, null, 2));

  // What's shown on screen: raw base64 fields collapsed to a placeholder, since dumping a multi-KB (or multi-MB) string into the preview would defeat the point of a *readable* example.
  // The hidden field submitted below still uses the untouched requestJson above.
  const requestJsonForDisplay = $derived.by(() => {
    const display: Record<string, unknown> = { ...requestBody };
    for (const key of ["authorAvatarRaw", "watermarkRaw"] as const) {
      const value = display[key];
      if (typeof value === "string") {
        display[key] = `<base64, ${value.length} chars>`;
      }
    }
    return JSON.stringify(display, null, 2);
  });

  const endpointPath = $derived(fake ? "/api/fakequote" : "/api/quote");
  const curlExample = $derived(
    `curl -X POST "${data.siteUrl}${endpointPath}" \\\n  -H "X-API-Key: ${apiKey || "<your API key>"}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestJsonForDisplay.replace(/\n\s*/g, " ")}'`,
  );
</script>

<div class="space-y-6">
  <Card.Root class="mx-auto max-w-2xl">
    <Card.Header>
      <Card.Title>{tr.playground.title}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-muted-foreground text-sm">{tr.playground.description}</p>
      <p class="text-muted-foreground text-xs">{tr.playground.noHostedNote}</p>

      <div class="space-y-1">
        <Label for="pg-api-key">{tr.playground.apiKeyLabel}</Label>
        <Input
          id="pg-api-key"
          type="password"
          autocomplete="off"
          bind:value={apiKey}
          placeholder={data.playgroundSharedKeyAvailable
            ? tr.playground.apiKeyOptionalPlaceholder
            : tr.playground.apiKeyPlaceholder}
        />
        <p class="text-muted-foreground text-xs">{tr.playground.apiKeyHint}</p>
        {#if data.playgroundSharedKeyAvailable}
          <p class="text-muted-foreground text-xs">
            {tr.playground.apiKeySharedHint}
          </p>
        {/if}
      </div>

      <div class="space-y-1">
        <Label for="pg-text">{tr.playground.textLabel}</Label>
        <textarea
          id="pg-text"
          bind:value={text}
          maxlength="4000"
          rows="3"
          class="border-input flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <Label for="pg-username">{tr.playground.usernameLabel}</Label>
          <Input id="pg-username" bind:value={authorName} maxlength={128} />
        </div>
        <div class="space-y-1">
          <Label for="pg-theme">{tr.playground.themeLabel}</Label>
          <Input
            id="pg-theme"
            bind:value={theme}
            placeholder={tr.playground.themePlaceholder}
          />
        </div>
        <div class="space-y-1">
          <Label for="pg-font">{tr.playground.fontLabel}</Label>
          <Input
            id="pg-font"
            bind:value={font}
            placeholder={tr.playground.fontPlaceholder}
          />
        </div>
        <div class="space-y-1">
          <Label for="pg-layout">{tr.playground.layoutLabel}</Label>
          <select
            id="pg-layout"
            bind:value={layout}
            class="border-input dark:bg-input/30 text-foreground h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="default" class="bg-popover text-popover-foreground"
              >{tr.playground.layoutDefault}</option
            >
            <option value="side" class="bg-popover text-popover-foreground"
              >{tr.playground.layoutSide}</option
            >
            <option value="new" class="bg-popover text-popover-foreground"
              >{tr.playground.layoutNew}</option
            >
          </select>
        </div>
      </div>

      <fieldset class="space-y-2 rounded-lg border p-3">
        <legend class="text-sm font-medium">{tr.playground.avatarLabel}</legend>
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={avatarMode} value="url" />
            {tr.playground.byUrl}
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={avatarMode} value="upload" />
            {tr.playground.byUpload}
          </label>
        </div>
        {#if avatarMode === "url"}
          <Input
            bind:value={authorAvatarUrl}
            type="url"
            placeholder={tr.playground.urlPlaceholder}
          />
        {:else}
          <Input type="file" accept="image/*" onchange={onAvatarFile} />
          {#if avatarFileName}
            <p class="text-muted-foreground text-xs">{avatarFileName}</p>
          {/if}
        {/if}
      </fieldset>

      <fieldset class="space-y-2 rounded-lg border p-3">
        <legend class="text-sm font-medium"
          >{tr.playground.watermarkLabel}</legend
        >
        <div class="flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={watermarkMode} value="default" />
            {tr.playground.watermarkDefault}
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={watermarkMode} value="text" />
            {tr.playground.byText}
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={watermarkMode} value="url" />
            {tr.playground.byUrl}
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={watermarkMode} value="upload" />
            {tr.playground.byUpload}
          </label>
        </div>
        {#if watermarkMode === "text"}
          <Input
            bind:value={watermark}
            placeholder={tr.playground.watermarkPlaceholder}
          />
        {:else if watermarkMode === "url"}
          <Input
            bind:value={watermarkUrl}
            type="url"
            placeholder={tr.playground.urlPlaceholder}
          />
        {:else if watermarkMode === "upload"}
          <Input type="file" accept="image/*" onchange={onWatermarkFile} />
          {#if watermarkFileName}
            <p class="text-muted-foreground text-xs">{watermarkFileName}</p>
          {/if}
        {/if}
      </fieldset>

      <div class="flex flex-wrap gap-4 text-sm">
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={color} />
          {tr.playground.colorLabel}
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={bold} />
          {tr.playground.boldLabel}
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={fake} />
          {tr.playground.fakeLabel}
        </label>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root class="mx-auto max-w-2xl">
    <Card.Header>
      <Card.Title>{tr.playground.requestLabel}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <pre
        class="bg-muted overflow-x-auto rounded-md p-3 text-xs">{requestJson}</pre>
      <details class="text-sm">
        <summary class="text-muted-foreground cursor-pointer"
          >{tr.playground.curlLabel}</summary
        >
        <pre
          class="bg-muted mt-2 overflow-x-auto rounded-md p-3 text-xs">{curlExample}</pre>
      </details>

      <form
        method="POST"
        action="?/send"
        use:enhance={() => {
          sending = true;
          return async ({ update }) => {
            await update();
            sending = false;
          };
        }}
      >
        <input type="hidden" name="apiKey" value={apiKey} />
        <input type="hidden" name="fake" value={fake} />
        <input type="hidden" name="requestJson" value={requestJson} />
        <Button
          type="submit"
          disabled={sending || (!apiKey && !data.playgroundSharedKeyAvailable)}
        >
          {sending ? tr.playground.sending : tr.playground.send}
        </Button>
        {#if !apiKey && !data.playgroundSharedKeyAvailable}
          <p class="text-muted-foreground mt-1 text-xs">
            {tr.playground.apiKeyRequired}
          </p>
        {/if}
      </form>
    </Card.Content>
  </Card.Root>

  {#if form}
    <Card.Root class="mx-auto max-w-2xl">
      <Card.Header>
        <Card.Title>{tr.playground.resultLabel}</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-3">
        {#if form.imageDataUrl}
          <img
            src={form.imageDataUrl}
            alt={tr.playground.resultImageAlt}
            class="max-w-full rounded-lg shadow-sm"
          />
        {:else if form.error}
          <p class="text-destructive text-sm font-medium">
            {tr.playground.errorLabel}{form.status ? ` (${form.status})` : ""}
          </p>
          <pre
            class="bg-destructive/10 overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(
              form.error,
              null,
              2,
            )}</pre>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>
