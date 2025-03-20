<script>
  import * as config from '$lib/config';
</script>

<div class="glass-footer">
  <div class="footer-container">
    <p>{config.title} &copy; {new Date().getFullYear()}</p>
  </div>
</div>

<style>
  /* Glass-like container (similar to .glass-navbar) */
  .glass-footer {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(10px);
		box-shadow: var(--shadow-3);
    position: sticky;  /* or fixed if you always want it at the bottom */
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    padding-top: 0.5rem;
		padding-bottom: 0.5rem;
  }

  /* Footer content constrained to 1200px, centered */
  .footer-container {
    width: 100%;
    padding: 0 0.25rem;
		display: flex;
		justify-content: flex-end;
		align-items: bottom;
		margin-bottom: 0;
  }

  p {
		all: unset;
    margin: 0;
    color: var(--gray-9);
		padding:0;
		font-size: 1rem;

  }

	.glass-footer {
	margin:0;
  position: fixed;
}

</style>
