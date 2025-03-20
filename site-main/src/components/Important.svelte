<script>
  import { onMount } from 'svelte';

  export let title = 'Heads Up!';

  // We’ll bind this container so we can observe it
  let container;

  // Track whether this component is sufficiently in view
  let inView = false;

  // Callback for the IntersectionObserver
  function handleIntersect(entries) {
    for (const entry of entries) {
      // If intersectionRatio >= 0.5, mark the component as in-view
      if (entry.intersectionRatio >= 0.5) {
        inView = true;
        // Optionally, unobserve so it doesn't toggle back out on scroll
        observer.disconnect();
        break;
      }
    }
  }

  // Create and set up the IntersectionObserver on mount
  let observer;
  onMount(() => {
    observer = new IntersectionObserver(handleIntersect, { threshold: 0.5 });
    observer.observe(container);
  });
</script>

<div
  bind:this={container}
  class="important-info"
  class:animate-in={inView}
>
  <div class="info-bar">
    <!-- Icon from lucide-svelte, or remove/replace as needed -->
    <!-- <Activity class="info-bar-icon" /> -->
    <h3>{title}</h3>
  </div>
  <div class="info-content">
    <slot />
  </div>
</div>

<style>
  .important-info {
    /* “Glass” background */
    background-color: #ffffff0f;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);

    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    color: #fff;
    margin: 1rem 0;
    box-sizing: border-box;

    /* The default (before animation triggers) */
    transform: scale(0);
    opacity: 0;
    transition: transform 0.5s ease, opacity 0.5s ease;
  }

  .important-info.animate-in {
    /* Once in view, scale up and fade in */
    transform: scale(1);
    opacity: 1;
  }

  .info-bar {
    background: linear-gradient(120deg, var(--orange-7) 0%, var(--orange-4) 100%);
    background-blend-mode: overlay;
    background-repeat: no-repeat;
    background-size: cover;

    padding: 0.25rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .info-bar h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--blue-10);

  }

  .info-content {
    padding: 1rem;
  }
</style>
