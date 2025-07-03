import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface LinkBadgeOptions {
  HTMLAttributes: Record<string, unknown>;
  openOnClick: boolean;
  validate?: (url: string) => boolean;
  fetchPreview?: (url: string) => Promise<unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkBadge: {
      /**
       * Set a link badge mark
       */
      setLinkBadge: (attributes: { href: string }) => ReturnType;
      /**
       * Toggle a link badge mark
       */
      toggleLinkBadge: (attributes: { href: string }) => ReturnType;
      /**
       * Unset a link badge mark
       */
      unsetLinkBadge: () => ReturnType;
    };
  }
}

export const LinkBadge = Mark.create<LinkBadgeOptions>({
  name: 'linkBadge',

  priority: 1000,

  keepOnSplit: false,

  onCreate() {
    // Auto-convert URLs and markdown links to LinkBadge marks
    this.editor.registerPlugin(
      new Plugin({
        key: new PluginKey('linkBadgeAutoConvert'),
        
        appendTransaction: (transactions, oldState, newState) => {
          const tr = newState.tr;
          let modified = false;

          // Check for URL patterns and markdown links
          newState.doc.descendants((node, pos) => {
            if (node.isText && node.text) {
              const text = node.text;
              
              // Match URLs: http(s)://... 
              const urlRegex = /https?:\/\/[^\s)]+/g;
              let match;
              
              while ((match = urlRegex.exec(text)) !== null) {
                const url = match[0];
                const start = pos + match.index;
                const end = start + url.length;
                
                // Check if this range is already marked
                const marks = newState.doc.resolve(start).marks();
                const hasLinkBadge = marks.some(mark => mark.type.name === 'linkBadge');
                
                if (!hasLinkBadge && this.options.validate?.(url) !== false) {
                  this.options.fetchPreview?.(url).catch(console.error);
                  
                  tr.addMark(start, end, this.type.create({ href: url }));
                  modified = true;
                }
              }
              
              // Match markdown links: [text](url)
              const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
              let mdMatch;
              
              while ((mdMatch = markdownRegex.exec(text)) !== null) {
                const fullMatch = mdMatch[0];
                const linkText = mdMatch[1];
                const url = mdMatch[2];
                const start = pos + mdMatch.index;
                const end = start + fullMatch.length;
                
                if (this.options.validate?.(url) !== false) {
                  // Replace the markdown syntax with just the link text and add the mark
                  tr.delete(start, end);
                  tr.insertText(linkText, start);
                  tr.addMark(start, start + linkText.length, this.type.create({ href: url }));
                  modified = true;
                  
                  this.options.fetchPreview?.(url).catch(console.error);
                }
              }
            }
          });

          return modified ? tr : null;
        },
      })
    );
  },

  addOptions() {
    return {
      openOnClick: true,
      HTMLAttributes: {
        class: 'link-badge',
      },
      validate: (url: string) => {
        return url.startsWith('http://') || url.startsWith('https://');
      },
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: element => element.getAttribute('href'),
        renderHTML: attributes => {
          if (!attributes.href) {
            return {};
          }
          return { href: attributes.href };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]',
        getAttrs: element => {
          const href = (element as HTMLElement).getAttribute('href');
          return href ? { href } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-link-badge': HTMLAttributes.href,
        class: 'link-badge-mark',
        href: HTMLAttributes.href,
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setLinkBadge:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },

      toggleLinkBadge:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },

      unsetLinkBadge:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        const { from, to } = this.editor.state.selection;
        const text = this.editor.state.doc.textBetween(from, to);
        
        if (text) {
          const url = window.prompt('Enter URL:', 'https://');
          if (url) {
            return this.editor.commands.setLinkBadge({ href: url });
          }
        }
        return false;
      },
    };
  },
});    