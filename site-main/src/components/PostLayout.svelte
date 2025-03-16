<script context="module">
  import Terminal from './Terminal.svelte';
  export { Terminal };
  import EmojiList from './EmojiList.svelte';
  export { EmojiList as ul, EmojiList as ol };
  import DefinitionList from './DefinitionList.svelte';
  export { DefinitionList };
  import DefinitionListEx from './DefinitionListEx.svelte';
  export { DefinitionListEx };
  import FlashCard from './FlashCard.svelte';
  export { FlashCard };
</script>

<slot />