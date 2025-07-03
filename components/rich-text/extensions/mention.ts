import { Node, mergeAttributes } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { Suggestion, SuggestionOptions } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionAutocomplete } from '@/components/mention-autocomplete';

export interface MentionOptions {
  HTMLAttributes: Record<string, unknown>;
  suggestion: Partial<SuggestionOptions>;
}

export const Mention = Node.create<MentionOptions>({
  name: 'mention',

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: '@',
        allowedPrefixes: [' ', '\n', ''],
        startOfLine: true,
      },
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }

          return {
            'data-id': attributes.id,
          };
        },
      },

      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }

          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': this.name },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      `@${node.attrs.label ?? node.attrs.id}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label ?? node.attrs.id}`;
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText(this.options.suggestion.char || '', pos, pos + node.nodeSize);

              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    console.log('Mention extension: addProseMirrorPlugins called');
    console.log('Mention extension: this.options.suggestion:', this.options.suggestion);
    
    const suggestionPlugin = Suggestion({
      editor: this.editor,
      char: '@',
      allowedPrefixes: [' ', '\n', ''],
      startOfLine: true,
      ...this.options.suggestion,
    });
    
    console.log('Mention extension: Suggestion plugin created:', suggestionPlugin);
    
    return [suggestionPlugin];
  },
});

export function createMentionSuggestion(searchMembers: (term: string) => Promise<unknown[]>) {
  return {
    items: async ({ query }: { query: string }) => {
      console.log('Mention suggestion triggered with query:', query);
      const results = await searchMembers(query);
      console.log('Search results:', results);
      console.log('Returning results count:', results.length);
      if (results.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first: any = results[0];
        console.log('First result structure:', JSON.stringify(first, null, 2));
        console.log('First result keys:', Object.keys(first));
      }
      console.log('About to return results from items function');
      return results;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
      console.log('Mention command called with:', { editor, range, props });
      
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: props,
          },
          {
            type: 'text',
            text: ' ',
          },
        ])
        .run();
      
      console.log('Mention command executed successfully');
    },

    render: () => {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStart: (props: any) => {
          console.log('Mention suggestion onStart called with props:', props);
          
          component = new ReactRenderer(MentionAutocomplete, {
            props: {
              items: props.items,
              onSelect: (member: unknown) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const m = member as any;
                console.log('Mention extension: Member selected via onSelect:', m);
                props.command({
                  id: m._id,
                  label: `${m.firstName} ${m.lastName}`,
                  slug: m.slug,
                });
              },
              onClose: () => {
                console.log('Mention autocomplete closing');
                popup[0]?.hide();
              },
            },
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate(props: any) {
          component.updateProps({
            items: props.items,
            onSelect: (member: unknown) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const m = member as any;
              console.log('Mention extension (onUpdate): Member selected via onSelect:', m);
              props.command({
                id: m._id,
                label: `${m.firstName} ${m.lastName}`,
                slug: m.slug,
              });
            },
            onClose: () => {
              popup[0]?.hide();
            },
          });

          if (!props.clientRect) {
            return;
          }

          popup[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0]?.hide();
            return true;
          }

          return false;
        },

        onExit() {
          popup[0]?.destroy();
          component.destroy();
        },
      };
    },

  };
}
