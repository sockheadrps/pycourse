<script>
  // Each item should be an object with `term`, `definition`, optionally `extra`, and optionally `code`
  export let items = [];
  let activeIndex = items.length > 0 ? 0 : null;
  import { createHighlighter } from 'shiki';
  import { onDestroy } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

  let highlighter;

  async function initHighlighter() {
    if (!highlighter) {
      highlighter = await createHighlighter({
        themes: ['tokyo-night'],
        langs: ['python'] // Changed to just python since that's what we need
      });
      await highlighter.loadLanguage('python'); // Explicitly load python language
    }
    return highlighter;
  }

  onDestroy(() => {
    if (highlighter) {
      highlighter.dispose();
    }
  });

  function toggle(index) {
    if (highlighter) {
      highlighter.dispose();
      highlighter = null;
    }
    activeIndex = activeIndex === index ? null : index;
  }

  let codeHtml = '';

  async function highlightCode(code, lang = 'python') { // Default to python
    const highlighterInstance = await initHighlighter();
    return await highlighterInstance.codeToHtml(code, { lang, theme: 'tokyo-night' });
  }
</script>

<div class="definition-list">
  {#each items as { term, definition, extra, code }, index}
    <div class="definition-item">
      <button type="button"
        class="term"
        on:click={() => toggle(index)}
        on:keydown={(e) => {
          if(e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle(index);
          }
        }}
        class:active={activeIndex === index}>
        <strong>{term}</strong>
      </button>
      {#if activeIndex === index}
        <div class="active-content">
          <div class="definition">
            {definition}
          </div>
          {#if extra}
            <div class="extra">
              {extra}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

{#if activeIndex !== null && items[activeIndex].code}
  {#key activeIndex}
<div class="code-container"in:fade={{ duration: 300, delay: 200, easing: quintOut }}>
    <div class="code-example" >
      {#await highlightCode(items[activeIndex].code)}
        <p>Loading...</p>
      {:then html}
        {@html html}
      {/await}
    </div>
  </div>
  {/key}
{/if}

<style>
  button {
    all: unset;
  }
  .definition-list {
    background-color: #24283b;
    color: #eee;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-block: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
    font-family: 'JetBrains Mono', monospace;
  }
  .definition-item {
    margin-bottom: 1rem;
  }
  .term {
    font-weight: bold;
    color: var(--blue-7);
    cursor: pointer;
    transition: color 0.2s ease, text-decoration 0.2s ease;
  }
  .term.active {
    font-size: 1.1rem;
    text-decoration: underline;
    color: var(--blue-4);
  }
  .term:hover {
    color: var(--blue-2);
  }
  /* Active content splits into two columns */
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
  /* Code example styling */
  .code-example :global(pre) {
    background-color: #1a1b26 !important;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-top: 1rem;
    overflow-x: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    min-width: 100%;
  }
  
  .code-example :global(code) {
    color: var(--gray-2) !important;
  }


</style>
