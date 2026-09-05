<script lang="ts">
  import { Popover } from "bits-ui";

  let { ref = $bindable(null), ...restProps }: Popover.TriggerProps = $props();
</script>

<Popover.Trigger bind:ref {...restProps} />
