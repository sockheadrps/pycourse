<!-- File: src/lib/VerticalHighlight.svelte -->
<script>
  // You can import transitions like fade or fly if you want
  // import { fade } from 'svelte/transition';
  import CircleAlert from 'lucide-svelte/icons/circle-alert';
</script>

<div class="vertical-highlight" >
  <!-- The child elements (like bolded list items) go here -->
  <slot />
</div>
<style>


  .vertical-highlight {
    /* Give it a “glass-like” look with partial transparency */
    background-color: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);

    /* Basic styling */
    color: #eee;
    padding: 1rem;
    margin-block: 1rem;
    border-radius: 0.5rem;

    /* The colored left border line */
    border-left: 4px solid #0f8eff; /* Customize color as desired */

    /* Optional box shadow for slight depth */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* Space content evenly vertically */
    gap: 1rem;
    align-items: flex-start;
  }
</style>
