import { visit } from 'unist-util-visit';

function customIframe() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      const iframeRegex = /{{iframe\s+src="(.*?)"}}/g;
      if (iframeRegex.test(node.value)) {
        const matches = [...node.value.matchAll(iframeRegex)];
        const newNodes = matches.map(([match, src]) => ({
          type: 'html',
          value: `<Iframe src="${src}" />`,
        }));
        
        // Split the text node and replace it with HTML nodes
        const remainingText = node.value.split(iframeRegex).filter(Boolean);
        const updatedNodes = [];
        let matchIndex = 0;

        for (let text of remainingText) {
          if (iframeRegex.test(text)) {
            updatedNodes.push(newNodes[matchIndex++]);
          } else {
            updatedNodes.push({ type: 'text', value: text });
          }
        }

        // Replace the original node
        Object.assign(node, { type: 'html', value: updatedNodes.map((n) => n.value).join('') });
      }
    });
  };
}

export default customIframe;
