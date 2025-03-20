<script>
	import { tick } from 'svelte';
	import { quintIn, quintOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	// Each item should be an object with `term`, `definition`, and optionally `extra` properties.
	export let items = [];
	let activeIndex = items.length > 0 ? 0 : null;
  let showExtra = true;
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

<div class="definition-list">
  {#each items as { term, definition, extra }, index}
    <div class="definition-item">
      <div class="term" on:click={() => toggle(index)} class:active={activeIndex === index}>
        <strong>{term}</strong>
      </div>
      {#if activeIndex === index}
        <div class="active-content">
          <div class="definition" in:fade={{ duration: 100, delay: 200, easing: quintOut }}>
            {definition}
          </div>
          {#if extra}
            {#if showExtra}
              <div class="extra" in:fade={{ duration: 100, delay: 200, easing: quintIn }}>
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
	.definition-list {
		background-color: #24283b;
		color: #eee;
		padding: 1.5rem;
		border-radius: 0.5rem;
		margin-block: 1rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
		font-family: 'JetBrains Mono', monospace;
		max-height: 40rem;
	}
	.definition-item {
		margin-bottom: 1rem;
	}
	.term {
		font-weight: bold;
		color: var(--blue-7);
		cursor: pointer;
		transition:
			color 0.2s ease,
			text-decoration 0.2s ease;
	}
	.term.active {
		font-size: 1.1rem;
		text-decoration: underline;
		color: var(--blue-4);
	}
	.term:hover {
		color: var(--blue-2);
	}
	/* The active area splits into two columns */
	.active-content {
		display: flex;
		margin-top: 0.5rem;
	}
	.definition {
		flex: 1;
		padding-right: 1rem;
		border-right: 1px solid var(--stone-9);
	}
	.extra {
		flex: 1;
		padding-left: 1rem;
	}
</style>
