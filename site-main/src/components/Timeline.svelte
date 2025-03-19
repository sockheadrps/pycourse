<script>
  import { createEventDispatcher } from 'svelte';

  // Steps: an array of objects like { label: string, active: boolean }
  export let steps = [];

  // Create Svelte's event dispatcher
  const dispatch = createEventDispatcher();

  function handleClick(index) {
    // Dispatch a 'select' event with { index }
    dispatch('select', { index });
  }
</script>

<div class="timeline-container">
  <div class="timeline-line">
    {#each steps as step, i}
      <button
        class="timeline-bubble {step.active ? 'active' : ''}"
        on:click={() => handleClick(i)}
        type="button"
      >
        {step.label}
      </button>

      {#if i < steps.length - 1}
        <div
          class="timeline-connector {step.active && steps[i + 1].active ? 'active-connector' : ''}"
        />
      {/if}
    {/each}
  </div>
</div>

<style>
  button {
    all: unset;
  }
  /* Container centers the timeline horizontally */
  .timeline-container {
    display: flex;
    justify-content: center;
    margin: 2rem auto;
    width: 80%;
    max-width: 800px;
  }

  /* The horizontal “line” that holds the bubbles and connectors */
  .timeline-line {
    display: flex;
    align-items: center;
  }

  /* Bubbles (buttons) */
  .timeline-bubble {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #2d2d2d;
    border: 2px solid #666;
    border-radius: 9999px;
    color: #fff;
    padding: 0.5rem 1rem;
    margin: 0 0.25rem;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.3s ease, border-color 0.3s ease;
  }

  /* Highlight “active” steps */
  .timeline-bubble.active {
    background: #0b1251; /* pink-ish color */
    border-color: #004d8c;
    color: #fff;
  }

  /* Connectors between bubbles */
  .timeline-connector {
    width: 2rem;
    height: 2px;
    background: #666;
    margin: 0 0.25rem;
    transition: background 0.3s ease;
  }

  /* Highlight active connectors */
  .timeline-connector.active-connector {
    background: #005790;
  }

  /* Optional hover styles */
  .timeline-bubble:hover {
    filter: brightness(125%);
    transition: filter 0.3s ease;
    box-shadow: 0 0 10px 0 rgba(71, 71, 71, 0.25);
  }
</style>
