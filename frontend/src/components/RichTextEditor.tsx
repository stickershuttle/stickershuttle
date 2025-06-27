import React, { useRef } from 'react';
import { $getRoot, $getSelection, $createParagraphNode } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { 
  $getSelection as getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { ListNode, ListItemNode } from '@lexical/list';
import { 
  INSERT_UNORDERED_LIST_COMMAND, 
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode
} from '@lexical/list';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Toolbar component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);
  const [isStrikethrough, setIsStrikethrough] = React.useState(false);

  const updateToolbar = React.useCallback(() => {
    const selection = getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
    }
  }, []);

  React.useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      1
    );
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: string) => {
    editor.update(() => {
      const selection = getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize as any));
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const insertList = (listType: 'ul' | 'ol') => {
    if (listType === 'ul') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
  };

  const activeButtonStyle = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.45) 50%, rgba(59, 130, 246, 0.3) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.6)',
    boxShadow: 'rgba(59, 130, 246, 0.5) 0px 8px 32px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-white/20 bg-white/5">
      {/* Text Format Buttons */}
      <button
        type="button"
        onClick={() => formatText('bold')}
        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
        style={isBold ? activeButtonStyle : buttonStyle}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => formatText('italic')}
        className="px-3 py-1 rounded text-white text-sm italic transition-all"
        style={isItalic ? activeButtonStyle : buttonStyle}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => formatText('underline')}
        className="px-3 py-1 rounded text-white text-sm underline transition-all"
        style={isUnderline ? activeButtonStyle : buttonStyle}
      >
        U
      </button>
      <button
        type="button"
        onClick={() => formatText('strikethrough')}
        className="px-3 py-1 rounded text-white text-sm line-through transition-all"
        style={isStrikethrough ? activeButtonStyle : buttonStyle}
      >
        S
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-white/20 mx-1"></div>

      {/* Heading Buttons */}
      <button
        type="button"
        onClick={() => formatHeading('h1')}
        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
        style={buttonStyle}
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => formatHeading('h2')}
        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
        style={buttonStyle}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => formatHeading('h3')}
        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
        style={buttonStyle}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => formatParagraph()}
        className="px-3 py-1 rounded text-white text-sm transition-all"
        style={buttonStyle}
      >
        P
      </button>

      {/* List Buttons */}
      <button
        type="button"
        onClick={() => insertList('ul')}
        className="px-3 py-1 rounded text-white text-sm transition-all"
        style={buttonStyle}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => insertList('ol')}
        className="px-3 py-1 rounded text-white text-sm transition-all"
        style={buttonStyle}
        title="Numbered List"
      >
        1. List
      </button>
    </div>
  );
}

// Component to handle HTML conversion
function HtmlChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        let htmlString = $generateHtmlFromNodes(editor, null);
        
        // If the HTML is empty or just whitespace, return empty
        if (!htmlString || !htmlString.trim()) {
          onChange('');
          return;
        }
        
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        
        // Check if the content has any block-level elements
        const hasBlockElements = tempDiv.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
        
        // If there are no block elements and there's text content, wrap it in a paragraph
        if (!hasBlockElements && tempDiv.textContent?.trim()) {
          htmlString = `<p>${htmlString}</p>`;
        }
        
        // Handle line breaks - if there are <br> tags not inside paragraphs, convert them
        if (htmlString.includes('<br>') && !htmlString.includes('<p>')) {
          const lines = htmlString.split('<br>').filter(line => line.trim());
          htmlString = lines.map(line => `<p>${line}</p>`).join('');
        }
        
        onChange(htmlString);
      });
    });
  }, [editor, onChange]);

  return null;
}

// Component to handle initial HTML content
function InitialContentPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  const previousHtmlRef = React.useRef<string>('');

  React.useEffect(() => {
    // Only update if the HTML actually changed
    if (html === previousHtmlRef.current) return;
    
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      
      try {
        if (html && html.trim()) {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          
          if (nodes.length > 0) {
            nodes.forEach(node => root.append(node));
          } else {
            // If no nodes were generated, create a paragraph
            const paragraph = $createParagraphNode();
            root.append(paragraph);
          }
        } else {
          // If no content, start with an empty paragraph
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        }
        
        previousHtmlRef.current = html;
      } catch (error) {
        console.error('Error initializing editor content:', error);
        // Fallback to empty paragraph on error
        const paragraph = $createParagraphNode();
        root.append(paragraph);
      }
    });
  }, [editor, html]);

  return null;
}

// Plugin to ensure proper paragraph handling
function ParagraphPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const element = anchorNode.getTopLevelElement();
          
          // If we're in a text node that's not in a paragraph, wrap it
          if (anchorNode.getType() === 'text' && (!element || element.getType() === 'root')) {
            event?.preventDefault();
            editor.update(() => {
              // Insert a paragraph break
              selection.insertParagraph();
            });
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
}

// Plugin to handle paste events and preserve formatting
function PastePlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const htmlData = clipboardData.getData('text/html');
        const textData = clipboardData.getData('text/plain');

        // Prevent default paste behavior
        event.preventDefault();

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          // If we have HTML data, use it
          if (htmlData) {
            const parser = new DOMParser();
            const dom = parser.parseFromString(htmlData, 'text/html');
            
            // Process the DOM to ensure proper structure
            const processedHtml = processHtmlForPaste(dom);
            const cleanDom = parser.parseFromString(processedHtml, 'text/html');
            
            const nodes = $generateNodesFromDOM(editor, cleanDom);
            selection.insertNodes(nodes);
          } else if (textData) {
            // Handle plain text by converting line breaks to paragraphs
            const lines = textData.split(/\r?\n/);
            let inParagraph = false;
            
            lines.forEach((line, index) => {
              const trimmedLine = line.trim();
              
              if (trimmedLine) {
                if (!inParagraph) {
                  if (index > 0) {
                    // Insert a new paragraph for non-empty lines after the first
                    selection.insertParagraph();
                  }
                  inParagraph = true;
                }
                selection.insertText(line);
              } else if (inParagraph) {
                // Empty line - end current paragraph
                inParagraph = false;
              }
            });
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  return null;
}

// Helper function to process HTML for paste
function processHtmlForPaste(dom: Document): string {
  try {
    const body = dom.body;
    
    // Simple processing - just return the HTML with some basic cleanup
    let html = body.innerHTML;
    
    // Convert double <br> tags to paragraph breaks
    html = html.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>');
    
    // Ensure content is wrapped in paragraphs if it isn't already
    if (html && !html.startsWith('<p') && !html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
      html = `<p>${html}</p>`;
    }
    
    return html;
  } catch (error) {
    console.error('Error processing HTML for paste:', error);
    return dom.body.innerHTML; // Return original HTML on error
  }
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start typing...", 
  className = "",
  style = {}
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'RichTextEditor',
    theme: {
      paragraph: 'mb-4',
      heading: {
        h1: 'text-3xl font-bold mb-4',
        h2: 'text-2xl font-bold mb-3',
        h3: 'text-xl font-bold mb-2'
      },
      list: {
        ul: 'list-disc list-inside mb-4',
        ol: 'list-decimal list-inside mb-4',
        listitem: 'mb-1'
      },
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through'
      }
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    }
  };

  return (
    <div 
      className={`rounded-lg border border-white/20 bg-white/10 backdrop-blur-md overflow-hidden ${className}`}
      style={style}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="px-4 py-3 text-white placeholder-white/60 focus:outline-none min-h-[200px] max-h-[400px] overflow-y-auto rich-text-editor-content"
                style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                }}
              />
            }
            placeholder={
              <div className="absolute top-3 left-4 text-white/60 pointer-events-none text-sm">
                {placeholder}
              </div>
            }
            ErrorBoundary={() => <div className="text-red-500 p-4">Editor Error</div>}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <ParagraphPlugin />
        <PastePlugin />
        <HtmlChangePlugin onChange={onChange} />
        <InitialContentPlugin html={value} />
        <AutoFocusPlugin />
      </LexicalComposer>
    </div>
  );
}