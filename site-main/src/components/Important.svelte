<script>
  export let title = "Heads Up!";
</script>

<div class="important-info">
  <div class="info-bar">
    <h3>{title}</h3>
  </div>
  <div class="info-content">
    <slot />
  </div>
</div>

<style>
  /* Container for the entire "glass" card */
  .important-info {
    /* Semi-transparent “glass” background */
    background-color: #ffffff0f;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);

    /* Rounded corners, subtle shadow */
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    overflow: hidden; /* ensures the top bar lines up cleanly with the edges */
    color: #fff;      /* default text color on dark backgrounds */
    margin: 1rem 0;
    box-sizing: border-box;
  }

  /* Top bar with a colorful gradient */
  .info-bar {
    /* Eye-catching gradient at a diagonal */
    background: linear-gradient(
      120deg,
      #0c267d31 0%,
      #091d5f31 100%
    );

    /* Subtle pattern overlay for a unique texture (optional) */
    background-blend-mode: overlay;
    background-repeat: no-repeat;
    background-size: cover;

    /* Title bar styling */
    padding: 0.25rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    position: relative;
  }

  /* Title text in the bar */
  .info-bar h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #fff; /* ensure text stands out on the gradient */
  }

  /* Content area below the title bar */
  .info-content {
    padding: 1rem;
  }
</style>
