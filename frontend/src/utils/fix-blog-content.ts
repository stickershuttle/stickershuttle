export function fixBlogContent(content: string): string {
  if (!content || !content.trim()) {
    return '';
  }

  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Check if the content already has proper block-level elements
  const blockElements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, div');
  if (blockElements.length > 0) {
    // Content already has block elements, return as is
    return content;
  }

  // If the entire content is just text without any HTML tags
  if (tempDiv.innerHTML === tempDiv.textContent) {
    // Split by double line breaks to create paragraphs
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    }
    // Single paragraph
    return `<p>${content.trim()}</p>`;
  }

  // Handle content with inline tags but no block tags
  const walker = document.createTreeWalker(
    tempDiv,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Check if this text node is already inside a block element
        let parent = node.parentElement;
        while (parent && parent !== tempDiv) {
          const tagName = parent.tagName.toLowerCase();
          if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const textNodesToWrap: Node[] = [];
  let node;
  while (node = walker.nextNode()) {
    textNodesToWrap.push(node);
  }

  // Group consecutive text nodes and their inline siblings into paragraphs
  const paragraphs: Node[][] = [];
  let currentParagraph: Node[] = [];
  
  textNodesToWrap.forEach((textNode, index) => {
    currentParagraph.push(textNode);
    
    // Check if next text node is far away (different paragraph)
    if (index < textNodesToWrap.length - 1) {
      const nextTextNode = textNodesToWrap[index + 1];
      const currentParent = textNode.parentNode;
      const nextParent = nextTextNode.parentNode;
      
      // If they have different parents or there are block elements between them, start new paragraph
      if (currentParent !== nextParent) {
        paragraphs.push([...currentParagraph]);
        currentParagraph = [];
      }
    }
  });
  
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }

  // Wrap each group in a paragraph
  paragraphs.forEach(nodes => {
    if (nodes.length > 0) {
      const p = document.createElement('p');
      const firstNode = nodes[0];
      firstNode.parentNode?.insertBefore(p, firstNode);
      
      // Move all nodes and their inline siblings to the paragraph
      nodes.forEach(node => {
        // Also include any inline elements between text nodes
        let current = node as Node;
        while (current && !p.contains(current)) {
          const next = current.nextSibling;
          p.appendChild(current);
          current = next as Node;
          
          // Stop if we hit a block element or another text node we're tracking
          if (current && (
            (current.nodeType === Node.ELEMENT_NODE && 
             ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'ul', 'ol', 'blockquote'].includes((current as Element).tagName.toLowerCase())) ||
            nodes.includes(current)
          )) {
            break;
          }
        }
      });
    }
  });

  return tempDiv.innerHTML;
} 