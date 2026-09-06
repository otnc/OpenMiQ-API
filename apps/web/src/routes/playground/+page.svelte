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
  // Loaded/persisted client-side only — the server action forwards it to
  // /api/quote per request and never writes it anywhere itself.
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
  let authorAvatarUrl = $state("");
  let theme = $state("");
  let font = $state("");
  let layout = $state<"default" | "side" | "new">("default");
  let color = $state(false);
  let bold = $state(false);
  let watermark = $state("");
  let fake = $state(false);
  let hosted = $state(false);
  let sending = $state(false);

  // Mirrors apps/api's own buildPayload() (src/routes/payload.ts) — every
  // optional field is left out entirely rather than sent empty, the same
  // rule @makeitaquote/openmiq's builder follows.
  const requestBody = $derived.by(() => {
    const options: Record<string, unknown> = {};
    if (color) options.color = true;
    if (bold) options.bold = true;
    if (layout !== "default") options.layout = layout;
    if (hosted) options.hosted = true;

    const body: Record<string, unknown> = { authorName, text };
    if (authorAvatarUrl) body.authorAvatarUrl = authorAvatarUrl;
    if (theme) body.theme = theme;
    if (font) body.font = font;
    if (watermark) body.watermark = watermark;
    if (Object.keys(options).length > 0) body.options = options;
    return body;
  });

  const requestJson = $derived(JSON.stringify(requestBody, null, 2));
  const endpointPath = $derived(fake ? "/api/fakequote" : "/api/quote");
  const curlExample = $derived(
    `curl -X POST "${data.siteUrl}${endpointPath}" \\\n  -H "X-API-Key: ${apiKey || "<your API key>"}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(requestBody)}'`,
  );
</script>

<div class="space-y-6">
  <Card.Root class="mx-auto max-w-2xl">
    <Card.Header>
      <Card.Title>{tr.playground.title}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-muted-foreground text-sm">{tr.playground.description}</p>

      <div class="space-y-1">
        <Label for="pg-api-key">{tr.playground.apiKeyLabel}</Label>
        <Input
          id="pg-api-key"
          type="password"
          autocomplete="off"
          bind:value={apiKey}
          placeholder={tr.playground.apiKeyPlaceholder}
        />
        <p class="text-muted-foreground text-xs">{tr.playground.apiKeyHint}</p>
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
          <Label for="pg-avatar">{tr.playground.avatarLabel}</Label>
          <Input id="pg-avatar" bind:value={authorAvatarUrl} type="url" />
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
            class="border-input flex h-8 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
          >
            <option value="default">{tr.playground.layoutDefault}</option>
            <option value="side">{tr.playground.layoutSide}</option>
            <option value="new">{tr.playground.layoutNew}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label for="pg-watermark">{tr.playground.watermarkLabel}</Label>
          <Input
            id="pg-watermark"
            bind:value={watermark}
            placeholder={tr.playground.watermarkPlaceholder}
          />
        </div>
      </div>

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
          <input type="checkbox" bind:checked={hosted} />
          {tr.playground.hostedLabel}
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
        <Button type="submit" disabled={sending || !apiKey}>
          {sending ? tr.playground.sending : tr.playground.send}
        </Button>
        {#if !apiKey}
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
        {:else if form.hostedUrl}
          <p class="text-sm">
            {tr.playground.hostedUrlLabel}
            <a
              href={form.hostedUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary underline">{form.hostedUrl}</a
            >
          </p>
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
