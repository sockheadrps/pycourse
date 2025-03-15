<script lang="js">
  export let digress;
</script>

<digression class="custom-container">{digress}</digression>

<style>
.custom-container {
  display: flex;
  flex-direction: column;
  gap: var(--size-7);
  margin-inline: auto;
  max-width: 400px;
  padding: var(--size-7);
  padding-top: var(--size-9);
  padding-bottom: var(--size-9);
  border-radius: var(--radius-2);
  background-color: var(--surface-2);
  box-shadow: var(--shadow-1);
  transition: var(--transition);
  height: auto;
  border: none;
    width: 100%;
    height: 100vh;
    overflow:hidden;
    display: block;
    margin-top: var(--size-7);
}
</style>
