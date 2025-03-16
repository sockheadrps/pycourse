// import adapter from '@sveltejs/adapter-auto'
import adapter from '@sveltejs/adapter-static'

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import remarkToc from 'remark-toc'
import rehypeSlug from 'rehype-slug'

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { mdsvex, escapeSvelte } from 'mdsvex'
import { createHighlighter } from 'shiki'

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md', '.svx'],
	layout: join(__dirname, './src/components/PostLayout.svelte'),
  remarkPlugins: [[remarkToc, { tight: true }]],
	rehypePlugins: [rehypeSlug],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const highlighter = await createHighlighter({
				themes: ['tokyo-night'],
				langs: ['javascript', 'typescript']
			})
			await highlighter.loadLanguage('javascript', 'python')
			const html = escapeSvelte(highlighter.codeToHtml(code, { lang, theme: 'tokyo-night' }))
			return `{@html \`${html}\` }`
		}
	},
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx'],
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],
	kit: {
		adapter: adapter()
	}
}

export default config
