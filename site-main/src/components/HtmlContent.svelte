<script>
	export let content = '';

	// Extract body content from full HTML if needed
	$: bodyContent = extractBodyContent(content);

	function extractBodyContent(html) {
		// If it's a full HTML document, extract just the body content
		if (html.includes('<body>') && html.includes('</body>')) {
			const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
			if (bodyMatch) {
				return bodyMatch[1];
			}
		}
		// If it's just HTML content, return as is
		return html;
	}
</script>

<div class="html-content">
	{@html bodyContent}
</div>

<style>
	.html-content {
		width: 100%;
		height: 100%;
		overflow: auto;
	}

	/* Ensure the HTML content doesn't inherit SvelteKit styles */
	.html-content :global(*) {
		box-sizing: border-box;
	}

	/* Let the HTML content use its own styles */
	.html-content :global(body) {
		background: none !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	.html-content :global(.container) {
		max-width: none !important;
		width: 100% !important;
		background: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
	}

	.html-content :global(.header) {
		background: none !important;
		color: inherit !important;
		padding: 0 !important;
		text-align: left !important;
	}

	/* Ensure the guide content is properly styled */
	.html-content :global(html) {
		background: none !important;
	}
</style>
