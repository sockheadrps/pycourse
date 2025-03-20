<script>
  export let ordered = false;
</script>
<div class="container">
{#if ordered}
  <ol class="emoji-list">
    <slot />
  </ol>
{:else}
  <ul class="emoji-list">
    <slot />
  </ul>
{/if}
</div>
<style>
  .container {
    background-color: #24283b;
    color: #eee;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-block: 1rem;
    font-family: 'JetBrains Mono', monospace;
  }
  :global(.emoji-list) {
    list-style-type: '💲';
  }
  :global(.emoji-list ul) {
    list-style-type: '🔹';
  }

</style>