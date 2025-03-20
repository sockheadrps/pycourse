<script lang="ts">
	import * as config from '$lib/config';
</script>

<div class="glass-navbar">
	<nav class="nav-container">
		<a href="/" class="title">
			{config.title}
		</a>

		<ul class="links">
			<li><a href="/about">About</a></li>
			<li><a href="/rss.xml" target="_blank">RSS</a></li>
		</ul>
	</nav>
</div>

<style>
	/* Glass-like container */
	.glass-navbar {
		background: rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(10px);
		padding-top: 1rem;
		padding-bottom: 1rem;
		margin-bottom: 1rem;
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		box-shadow: var(--shadow-3);
		display: flex;
		justify-content: center;
	}

	/* Container for nav to match the width of the main container */
	.nav-container {
		width: 100%;
		max-width: 1200px;
		padding: 0 2rem;
		box-sizing: border-box;
	}

	/* Horizontal nav bar by default */
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	/* Title link styling */
	.title {
		color: var(--gray-6);
		text-decoration: none;
		font-weight: bold;
		font-size: 1.5rem;
		transition: color 0.3s ease, text-shadow 0.3s ease;
	}

	.title:hover {
		color: var(--gray-4);
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.181);
	}

	/* Horizontal link list */
	.links {
		display: flex;
		gap: 1.5rem;
		list-style: none;
	}

	.links a {
		color: var(--gray-6);
		text-decoration: none;
		font-size: 1rem;
		transition: color 0.3s ease, text-shadow 0.3s ease;
	}

	.links a:hover {
		color: var(--gray-4);
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.181);
	}

	/* Media queries for phones */
	@media (max-width: 600px) {
		nav {
			flex-direction: column;
			align-items: center;
		}

		.title {
			font-size: 1.2rem;
		}

		.links {
			flex-direction: column;
			gap: 0.5rem;
			font-size: 0.9rem;
		}
	}
</style>
