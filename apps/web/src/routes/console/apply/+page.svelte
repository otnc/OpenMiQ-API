<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import { Label } from "$lib/components/ui/label/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));

  let fingerprint = $state("");

  $effect(() => {
    import("@fingerprintjs/fingerprintjs").then(async (FingerprintJS) => {
      const agent = await FingerprintJS.load();
      const result = await agent.get();
      fingerprint = result.visitorId;
    });
  });
</script>

<Card.Root class="mx-auto max-w-xl">
  <Card.Header>
    <Card.Title>{tr.apply.title}</Card.Title>
  </Card.Header>
  <Card.Content>
    {#if form?.error}
      <p
        class="bg-destructive/10 text-destructive mb-4 rounded-md px-3 py-2 text-sm"
      >
        {form.error}
      </p>
    {/if}

    <form method="POST" use:enhance class="space-y-4">
      <input type="hidden" name="fingerprint" value={fingerprint} />
      <input
        type="hidden"
        name="agreedTermsVersion"
        value={data.terms.version}
      />
      <input
        type="hidden"
        name="agreedPrivacyVersion"
        value={data.privacy.version}
      />

      <div class="space-y-1">
        <Label for="message">{tr.apply.messageLabel}</Label>
        <textarea
          id="message"
          name="message"
          minlength="20"
          maxlength="500"
          required
          rows="4"
          class="border-input flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs"
        ></textarea>
        <p class="text-muted-foreground text-xs">{tr.apply.messageHint}</p>
      </div>

      <details class="rounded-md border p-3 text-sm">
        <summary class="cursor-pointer font-medium"
          >Terms of Service (v{data.terms.version})</summary
        >
        <pre class="mt-2 whitespace-pre-wrap text-xs">{data.terms.content}</pre>
      </details>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" name="agreeTerms" required />
        {tr.apply.agreeTerms}
      </label>

      <details class="rounded-md border p-3 text-sm">
        <summary class="cursor-pointer font-medium"
          >Privacy Policy (v{data.privacy.version})</summary
        >
        <pre class="mt-2 whitespace-pre-wrap text-xs">{data.privacy
            .content}</pre>
      </details>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" name="agreePrivacy" required />
        {tr.apply.agreePrivacy}
      </label>

      <Button type="submit">{tr.apply.submit}</Button>
    </form>
  </Card.Content>
</Card.Root>
