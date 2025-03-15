<script>
  import { createHighlighter } from 'shiki';
  import rehypeShiki from '@shikijs/rehype';

  let code = 'blah';
  let html = '';

  (async () => {
    const highlighter = await createHighlighter({
      themes: ['poimandres', 'github-light', 'poimandres', 'github-dark-dimmed'],
      langs: ['javascript', 'typescript', 'svelte', 'python'],
    });

    html = highlighter.codeToHtml(code, {
      lang: 'js',
      theme: {
        light: 'github-light',
        dark: 'poimandres',
        dimmed: 'github-dark-dimmed'
      },
      defaultColor: 'dimmed',  // Fix typo here
    });
  })();
</script>
