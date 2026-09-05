<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
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

<h1 class="mb-4 text-xl font-semibold">{tr.apply.title}</h1>

{#if form?.error}
  <p class="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{form.error}</p>
{/if}

<form method="POST" use:enhance class="space-y-4">
  <input type="hidden" name="fingerprint" value={fingerprint} />
  <input type="hidden" name="agreedTermsVersion" value={data.terms.version} />
  <input
    type="hidden"
    name="agreedPrivacyVersion"
    value={data.privacy.version}
  />

  <div>
    <label for="message" class="mb-1 block text-sm font-medium"
      >{tr.apply.messageLabel}</label
    >
    <textarea
      id="message"
      name="message"
      minlength="20"
      maxlength="500"
      required
      rows="4"
      class="w-full rounded border border-neutral-300 px-3 py-2"></textarea>
    <p class="mt-1 text-xs text-neutral-500">{tr.apply.messageHint}</p>
  </div>

  <details class="rounded border border-neutral-200 p-3 text-sm">
    <summary class="cursor-pointer font-medium"
      >Terms of Service (v{data.terms.version})</summary
    >
    <pre class="mt-2 whitespace-pre-wrap text-xs">{data.terms.content}</pre>
  </details>
  <label class="flex items-center gap-2 text-sm">
    <input type="checkbox" name="agreeTerms" required />
    {tr.apply.agreeTerms}
  </label>

  <details class="rounded border border-neutral-200 p-3 text-sm">
    <summary class="cursor-pointer font-medium"
      >Privacy Policy (v{data.privacy.version})</summary
    >
    <pre class="mt-2 whitespace-pre-wrap text-xs">{data.privacy.content}</pre>
  </details>
  <label class="flex items-center gap-2 text-sm">
    <input type="checkbox" name="agreePrivacy" required />
    {tr.apply.agreePrivacy}
  </label>

  <button
    type="submit"
    class="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
  >
    {tr.apply.submit}
  </button>
</form>
