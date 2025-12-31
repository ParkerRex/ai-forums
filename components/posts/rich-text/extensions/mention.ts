import type { Editor, Range } from "@tiptap/core";
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import {
  Suggestion,
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { MentionAutocomplete } from "@/components/comments/mention-autocomplete";

// Type for member data returned by search
interface MemberSearchResult {
  _id: string;
  firstName: string;
  lastName: string;
  slug: string;
  [key: string]: unknown; // Allow other properties
}

export interface MentionOptions {
  HTMLAttributes: Record<string, unknown>;
  suggestion: Partial<SuggestionOptions>;
}

export const Mention = Node.create<MentionOptions>({
  name: "mention",

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "@",
        allowedPrefixes: [" ", "\n", ""],
        startOfLine: true,
      },
    };
  },

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            "data-id": attributes.id,
          };
        },
      },

      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }

          return {
            "data-label": attributes.label,
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
      "span",
      mergeAttributes({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
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
              tr.insertText(this.options.suggestion.char || "", pos, pos + node.nodeSize);

              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    console.log("Mention extension: addProseMirrorPlugins called");
    console.log("Mention extension: this.options.suggestion:", this.options.suggestion);

    const suggestionPlugin = Suggestion({
      editor: this.editor,
      char: "@",
      allowedPrefixes: [" ", "\n", ""],
      startOfLine: true,
      ...this.options.suggestion,
    });

    console.log("Mention extension: Suggestion plugin created:", suggestionPlugin);

    return [suggestionPlugin];
  },
});

export function createMentionSuggestion(
  searchMembers: (term: string) => Promise<MemberSearchResult[]>,
) {
  return {
    items: async ({ query }: { query: string }) => {
      console.log("Mention suggestion triggered with query:", query);
      const results = await searchMembers(query);
      console.log("Search results:", results);
      console.log("Returning results count:", results.length);
      if (results.length > 0) {
        const first = results[0];
        console.log("First result structure:", JSON.stringify(first, null, 2));
        console.log("First result keys:", Object.keys(first));
      }
      console.log("About to return results from items function");
      return results;
    },

    command: ({ editor, range, props }: { editor: Editor; range: Range; props: unknown }) => {
      console.log("Mention command called with:", { editor, range, props });

      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: props,
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();

      console.log("Mention command executed successfully");
    },

    render: () => {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
        onStart: (props: SuggestionProps<MemberSearchResult>) => {
          console.log("Mention suggestion onStart called with props:", props);

          component = new ReactRenderer(MentionAutocomplete, {
            props: {
              items: props.items,
              onSelect: (member: MemberSearchResult) => {
                console.log("Mention extension: Member selected via onSelect:", member);
                props.command({
                  id: member._id,
                  label: `${member.firstName} ${member.lastName}`,
                  slug: member.slug,
                });
              },
              onClose: () => {
                console.log("Mention autocomplete closing");
                popup[0]?.hide();
              },
            },
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props: SuggestionProps<MemberSearchResult>) {
          component.updateProps({
            items: props.items,
            onSelect: (member: MemberSearchResult) => {
              console.log("Mention extension (onUpdate): Member selected via onSelect:", member);
              props.command({
                id: member._id,
                label: `${member.firstName} ${member.lastName}`,
                slug: member.slug,
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
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === "Escape") {
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
