<!-- src/lib/Terminal.svelte -->
<script>
  // No specific props needed unless you want them
</script>

<div class="fake-terminal">
  <!-- Pass the child content from Markdown into here -->
  <slot />
</div>

<style>
  .fake-terminal {
    background-color: #2e2e2e;
    color: #eee;
    padding: 1.5rem 1rem;
    border-radius: 0.5rem;
    margin-block: 1rem;
    position: relative;
    overflow-x: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);

    /* Optional: add a "title bar" or "traffic light" circles if desired */
  }
</style>
