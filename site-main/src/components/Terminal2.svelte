<!-- src/lib/Terminal.svelte -->
<script>
  import { fly } from 'svelte/transition';
  import { onMount } from 'svelte';

  let terminalContent;

  function copyToClipboard() {
    const el = document.createElement('textarea');
    el.value = terminalContent.innerText;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  onMount(() => {
    terminalContent = document.querySelector('.fake-terminal');
  });
</script>

<div class="fake-terminal">
  <!-- Pass the child content from Markdown into here -->
  <slot />
  <button class="copy-button" on:click={copyToClipboard}>Copy</button>
</div>

<style>
  .fake-terminal {
    background-color: #24283b;
    color: #eee;
    padding: 1.5rem 1rem;
    border-radius: 0.5rem;
    margin-block: 1rem;
    position: relative;
    overflow-x: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);

    /* Optional: add a "title bar" or "traffic light" circles if desired */
  }

  .copy-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .copy-button:hover {
    background-color: #45a049;
  }

  @media (max-width: 600px) {
    .fake-terminal {
      padding: 1rem;
    }

    .copy-button {
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.25rem 0.5rem;
    }
  }
</style>
