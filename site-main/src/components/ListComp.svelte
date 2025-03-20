<script>
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { quintIn, quintOut } from 'svelte/easing';

  // Each item is expected to have at least a `term` and `definition`.
  // If provided, `extra` will also be displayed when expanded.
  export let items = [];

  // Track which item is currently active (expanded).
  let activeIndex = items.length > 0 ? 0 : null;
  let showExtra = true;

  // Helper function to re-trigger the showing of the "extra" section
  // so it can animate in again.
  async function refreshExtra() {
    showExtra = false;
    await tick();
    showExtra = true;
  }

  function toggle(index) {
    activeIndex = activeIndex === index ? null : index;
    refreshExtra();
  }
</script>

<div class="paper-list">
  {#each items as { term, definition, extra }, index}
    <div class="paper-list-item">
      <div
        class="item-header"
        on:click={() => toggle(index)}
      >
        <span class="item-index">{index + 1}.</span>
        <strong class="item-term">{term}</strong>
      </div>

      {#if activeIndex === index}
        <div class="active-content">
          <div
            class="definition"
            in:fade={{ duration: 100, delay: 200, easing: quintOut }}
          >
            {definition}
          </div>
          {#if extra}
            {#if showExtra}
              <div
                class="extra"
                in:fade={{ duration: 100, delay: 200, easing: quintIn }}
              >
                {extra}
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* Dark “paper” container */
  .paper-list {
    background-color: #2a2a2a; /* Dark gray background to emulate dark paper */
    color: #e2e2e2;            /* Light text contrast */
    border: 2px solid #3a3a3a; /* Subtle border for structure */
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4); /* Slightly stronger shadow */
    padding: 1rem 2rem;
    margin: 1rem 0;
    font-family: Georgia, serif;
  }

  .paper-list-item {
    position: relative;
    padding: 0.5rem 0;
    margin-bottom: 1rem;
    /* Dotted line in a mid-gray tone to mimic “paper” separation */
    border-bottom: 1px dotted #5a5a5a;
  }

  .paper-list-item:last-child {
    border-bottom: none;
  }

  .item-header {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .item-index {
    margin-right: 0.5rem;
    color: #999; /* Slightly lighter gray for the numbering */
  }

  .item-term {
    color: #f5f5f5; /* Brighter color for item titles */
    transition: text-decoration 0.2s ease, color 0.2s ease;
  }

  .item-header:hover .item-term {
    text-decoration: underline;
    color: #fff; /* Slight highlight on hover */
  }

  .active-content {
    margin-top: 0.5rem;
    display: flex;
  }

  /* The definition text in the expanded view */
  .definition {
    flex: 1;
    padding-right: 1rem;
    border-right: 1px solid #444; /* Divider between definition & extra */
  }

  /* The extra text in the expanded view (optional) */
  .extra {
    flex: 1;
    padding-left: 1rem;
  }
</style>
	