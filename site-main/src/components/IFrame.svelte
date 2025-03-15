<script lang="js">
  export let frameSrc;
</script>

<iframe
  src={frameSrc}
  title="Embedded content"
  width="100%"
  frameborder="0"
  loading="lazy"
  allowfullscreen
  sandbox="allow-scripts allow-same-origin"
></iframe>

<style>
  iframe {
    border: none;
    width: 100%;
    height: 100vh;
    overflow:hidden;
    display: block;
    margin-top: var(--size-7);

  }
</style>
