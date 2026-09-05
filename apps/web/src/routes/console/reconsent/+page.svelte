<script lang="ts">
  import { enhance } from "$app/forms";
  import { t } from "$lib/i18n/index.ts";
  import { Button } from "$lib/components/ui/button/index.ts";
  import * as Card from "$lib/components/ui/card/index.ts";
  import type { PageData, ActionData } from "./$types.ts";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tr = $derived(t(data.locale));

  // Default to the diff view (DESIGN.md §16.4) when one is available —
  // i.e. we know the version the user agreed to last and it's still in
  // history. Otherwise there's nothing to diff against, so full text only.
  let showFullText = $state(false);
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

    {#if data.termsDiff || data.privacyDiff}
      <div class="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onclick={() => (showFullText = !showFullText)}
        >
          {showFullText ? "Show changes only" : "Show full text"}
        </Button>
      </div>
    {/if}

    <form method="POST" use:enhance class="space-y-4">
      <input type="hidden" name="termsVersion" value={data.terms.version} />
      <input type="hidden" name="privacyVersion" value={data.privacy.version} />

      <details open class="rounded-md border p-3 text-sm">
        <summary class="cursor-pointer font-medium">
          Terms of Service (v{data.terms.version})
        </summary>
        {#if data.termsDiff && !showFullText}
          <p class="mt-2 whitespace-pre-wrap text-xs">
            {#each data.termsDiff.parts as part, i (i)}
              {#if part.added}
                <span class="bg-green-500/20 text-green-700 dark:text-green-400"
                  >{part.value}</span
                >
              {:else if part.removed}
                <span
                  class="bg-red-500/20 text-red-700 line-through dark:text-red-400"
                  >{part.value}</span
                >
              {:else}
                <span>{part.value}</span>
              {/if}
            {/each}
          </p>
        {:else}
          <pre class="mt-2 whitespace-pre-wrap text-xs">{data.terms
              .content}</pre>
        {/if}
      </details>

      <details open class="rounded-md border p-3 text-sm">
        <summary class="cursor-pointer font-medium">
          Privacy Policy (v{data.privacy.version})
        </summary>
        {#if data.privacyDiff && !showFullText}
          <p class="mt-2 whitespace-pre-wrap text-xs">
            {#each data.privacyDiff.parts as part, i (i)}
              {#if part.added}
                <span class="bg-green-500/20 text-green-700 dark:text-green-400"
                  >{part.value}</span
                >
              {:else if part.removed}
                <span
                  class="bg-red-500/20 text-red-700 line-through dark:text-red-400"
                  >{part.value}</span
                >
              {:else}
                <span>{part.value}</span>
              {/if}
            {/each}
          </p>
        {:else}
          <pre class="mt-2 whitespace-pre-wrap text-xs">{data.privacy
              .content}</pre>
        {/if}
      </details>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" name="agree" required />
        {tr.apply.agreeTerms} / {tr.apply.agreePrivacy}
      </label>

      <Button type="submit">{tr.apply.submit}</Button>
    </form>
  </Card.Content>
</Card.Root>
