<script lang="ts">
  import type {ShikiMagicMoveRendererProps} from './types'
	import { MagicMoveRenderer } from 'shiki-magic-move/renderer'
  

	const { ...props }: ShikiMagicMoveRendererProps = $props()

	let container: HTMLPreElement
	let renderer: MagicMoveRenderer
	let isMounted = $state(false)

	$effect(() => {
		if (!container) return
		container.innerHTML = ''
		isMounted = true
    // create the magic move renderer
		renderer = new MagicMoveRenderer(container)
	})

	$effect(() => {
		async function render() {
			if (!renderer) return
      // merge renderer options with our options
			Object.assign(renderer.options, props.options)
			if (props.animate) {
        // replace previous animation
				if (props.previous) renderer.replace(props.previous)
        // optional start callback
				props.onStart?.()
        // run the animation and return a promise
				await renderer.render(props.tokens)
        // optional end callback
				props.onEnd?.()
			} else {
        // update code without animation
				renderer.replace(props.tokens)
			}
		}
		render()
	})
</script>

<pre bind:this={container} class="shiki-magic-move-container">
  <!-- render initial tokens for SSR -->
  {#if !isMounted}
		{#each props.tokens.tokens as token}
			{#if token.content === '\n'}
				<br />
			{/if}
      <span class="shiki-magic-move-item">
        {token.content}
      </span>
		{/each}
	{/if}
</pre>
