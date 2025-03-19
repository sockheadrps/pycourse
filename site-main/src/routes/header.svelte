<script lang="ts">
	import * as config from '$lib/config';
</script>

<div class="title_rule">
	<nav>
		<!-- Make the site title link to home on all screen sizes -->
		<a href="/" class="title">
			{config.title}
		</a>

		<!-- Navigation links in a horizontal list -->
		<ul class="links">
			<li><a href="/about">About</a></li>
			<li><a href="/rss.xml" target="_blank">RSS</a></li>
		</ul>
	</nav>
</div>

<style>
	/* Container with bottom border */
	.title_rule {
		border-bottom: 1px solid var(--gray-6);
		margin-bottom: 1rem;
	}

	/* Horizontal nav bar by default */
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		box-sizing: border-box;
	}

	/* Title link styling */
	.title {
		color: var(--gray-6);
		text-decoration: none;
		font-weight: bold;
		font-size: 1.1rem;
	}

	.title:hover {
		text-decoration: underline;
	}

	/* Horizontal link list */
	.links {
		display: flex;
		gap: 1rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.links a {
		color: var(--gray-6);
		text-decoration: none;
	}

	.links a:hover {
		text-decoration: underline;
	}
	/* Media queries for phones */
	@media (max-width: 600px) {
		nav {
			display: flex;
			align-items: stretch;
			padding: 1rem 2rem;
			justify-content: space-between;
      
		}

    .title {
      font-size: 0.8rem;
    }
		.title_rule {
			border-bottom: 1px solid var(--gray-6);
			margin-bottom: 1rem;
			width: 90%;
			margin-left: auto;
			margin-right: auto;
		}

		.links {
			display: flex;
			margin: 0;
			padding: 0;
      font-size: 0.8rem;
		}
	}
</style>
