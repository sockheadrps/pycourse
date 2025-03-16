<script>
  export let ordered = false;
</script>

{#if ordered}
  <ol class="emoji-list">
    <slot />
  </ol>
{:else}
  <ul class="emoji-list">
    <slot />
  </ul>
{/if}
<style>
  :global(.emoji-list) {
    list-style-type: '💲';
  }
  :global(.emoji-list ul) {
    list-style-type: '🔹';
  }
</style>