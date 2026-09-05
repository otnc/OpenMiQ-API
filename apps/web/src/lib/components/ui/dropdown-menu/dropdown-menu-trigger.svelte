<script lang="ts">
  import { DropdownMenu } from "bits-ui";

  let { ref = $bindable(null), ...restProps }: DropdownMenu.TriggerProps =
    $props();
</script>

<DropdownMenu.Trigger bind:ref {...restProps} />
