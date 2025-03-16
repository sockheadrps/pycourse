<script>
  import { onMount, onDestroy } from 'svelte';
  import { createHighlighter } from 'shiki';

  // Props: description (array of strings), code (string), and an optional lang (default: 'python')
  export let description = [];
  export let code = '';
  export let lang = 'python';
  export let question = '';

  // Track whether the code is revealed
  let revealed = false;
  // Store the highlighted code as HTML
  let highlightedCode = '';

  // Create a singleton highlighter instance
  let highlighterPromise = createHighlighter({
    themes: ['tokyo-night'],
    langs: ['python', 'javascript'] // Pre-load common languages
  });

  let highlighter;

  onMount(async () => {
    highlighter = await highlighterPromise;
  });

  onDestroy(() => {
    if (highlighter) {
      highlighter.dispose();
    }
  });

  // Function to highlight the code using Shiki
  async function highlightCode() {
    if (!code) return;

    try {
      highlighter = await highlighterPromise;
      // Load language if not already loaded
      if (!highlighter.getLoadedLanguages().includes(lang)) {
        await highlighter.loadLanguage(lang);
      }
      highlightedCode = await highlighter.codeToHtml(code, { lang, theme: 'tokyo-night' });
    } catch (error) {
      console.error("Error highlighting code:", error);
    }
  }

  // Toggle the revealed state; if revealing, process the code if not done yet.
  async function toggleReveal() {
    revealed = !revealed;
    if (!revealed && highlighter) {
      highlighter.dispose();
      highlighter = null;
    } else if (revealed && code && !highlightedCode) {
      await highlightCode();
    }
  }
</script>

<div class="flashcard">
  {#if question}
    <div class="question">
      {question}
    </div>
  {/if}
  <div class="front">
    {#each description as line}
      <p>{line}</p>
    {/each}
    <button on:click={toggleReveal} class:revealed>
      <span class="button-text">{revealed ? 'Hide Code' : 'Reveal Code'}</span>
      <span class="icon">{revealed ? '▼' : '▶'}</span>
    </button>
  </div>
  {#if revealed && code}
    <div class="back" class:revealed>
      {#if highlightedCode}
        <pre class="code-example"><code>{@html highlightedCode}</code></pre>
      {:else}
        <p>Loading code...</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .flashcard {
    background-color: var(--stone-11);
    color: #eee;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
    font-family: 'JetBrains Mono', monospace;
  }
  .question {
    font-size: 1.1rem;
    color: var(--stone-6);
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--stone-9);
    font-style: italic;
  }
  .front {
    margin-bottom: 1rem;
  }
  .front p {
    margin: 0 0 1rem 0;
  }
  button {
    all: unset;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: 2px solid var(--blue-7);
    border-radius: 0.5rem;
    background-color: transparent;
    color: var(--blue-7);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  button:hover {
    background-color: var(--blue-7);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  button:active {
    transform: translateY(0);
    box-shadow: none;
  }
  button.revealed {
    background-color: var(--blue-7);
    color: #fff;
  }
  .icon {
    font-size: 0.8em;
    transition: transform 0.2s ease;
  }
  button.revealed .icon {
    transform: rotate(180deg);
  }
  .back {
    margin-top: 1rem;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  }
  .back.revealed {
    opacity: 1;
    transform: translateY(0);
  }
  .code-example :global(pre) {
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 0;
  }
</style>
