<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));
</script>

<Card.Root class="mx-auto max-w-xl">
  <Card.Header>
    <Card.Title>{tr.home.reconsentCta}</Card.Title>
  </Card.Header>
  <Card.Content>
    {#if form?.error}
      <p
        class="bg-destructive/10 text-destructive mb-4 rounded-md px-3 py-2 text-sm"
      >
        {form.error}
      </p>
    {/if}

    <!--
      Shows the full current text rather than a diff against the version the
      user last agreed to — DESIGN.md §16.4 calls for a diff-by-default view
      with a full-text toggle, but that needs version history for the legal
      content that doesn't exist yet (only the current text is stored).
      Deferred; full text is a correct, if less convenient, fallback.
    -->
    <form method="POST" use:enhance class="space-y-4">
      <input type="hidden" name="termsVersion" value={data.terms.version} />
      <input type="hidden" name="privacyVersion" value={data.privacy.version} />

      <details open class="rounded-md border p-3 text-sm">
        <summary class="cursor-pointer font-medium"
          >Terms of Service (v{data.terms.version})</summary
        >
        <pre class="mt-2 whitespace-pre-wrap text-xs">{data.terms.content}</pre>
      </details>

      <details open class="rounded-md border p-3 text-sm">
        <summary class="cursor-pointer font-medium"
          >Privacy Policy (v{data.privacy.version})</summary
        >
        <pre class="mt-2 whitespace-pre-wrap text-xs">{data.privacy
            .content}</pre>
      </details>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" name="agree" required />
        {tr.apply.agreeTerms} / {tr.apply.agreePrivacy}
      </label>

      <Button type="submit">{tr.apply.submit}</Button>
    </form>
  </Card.Content>
</Card.Root>
