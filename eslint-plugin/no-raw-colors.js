/**
 * ESLint rule to prevent raw Tailwind color classes
 * @fileoverview Disallow hard-coded color classes in favor of semantic tokens
 */

const BANNED_PATTERNS = [
  // Background colors
  /\bbg-white\b/,
  /\bbg-black(?!\/)/, // Allow bg-black/opacity but not plain bg-black
  /\bbg-gray-\d+\b/,
  /\bbg-slate-\d+\b/,
  /\bbg-zinc-\d+\b/,
  /\bbg-neutral-\d+\b/,
  /\bbg-stone-\d+\b/,
  
  // Text colors
  /\btext-white(?!\s+shadow|\s+\[a&\])/, // Allow text-white for destructive buttons
  /\btext-black\b/,
  /\btext-gray-\d+\b/,
  /\btext-slate-\d+\b/,
  /\btext-zinc-\d+\b/,
  /\btext-neutral-\d+\b/,
  /\btext-stone-\d+\b/,
  
  // Border colors
  /\bborder-white\b/,
  /\bborder-black\b/,
  /\bborder-gray-\d+\b/,
  /\bborder-slate-\d+\b/,
  /\bborder-zinc-\d+\b/,
  /\bborder-neutral-\d+\b/,
  /\bborder-stone-\d+\b/,
];

const SUGGESTED_REPLACEMENTS = {
  'bg-white': 'bg-background',
  'bg-gray-50': 'bg-muted',
  'bg-gray-200': 'bg-muted opacity-50 (for skeletons)',
  'text-gray-900': 'text-foreground',
  'text-gray-600': 'text-muted-foreground',
  'border-gray-200': 'border',
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow hard-coded color classes in favor of semantic tokens',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noRawColors: 'Hard-coded color class "{{className}}" should use semantic token. Suggested: {{suggestion}}',
    },
  },

  create(context) {
    function checkStringLiteral(node) {
      if (typeof node.value !== 'string') return;
      
      const classNames = node.value;
      
      for (const pattern of BANNED_PATTERNS) {
        const matches = classNames.match(new RegExp(pattern.source, 'g'));
        if (matches) {
          matches.forEach(match => {
            const suggestion = SUGGESTED_REPLACEMENTS[match] || 'a semantic token';
            context.report({
              node,
              messageId: 'noRawColors',
              data: {
                className: match,
                suggestion,
              },
            });
          });
        }
      }
    }

    return {
      // Check className props in JSX
      JSXAttribute(node) {
        if (node.name.name === 'className' && node.value) {
          if (node.value.type === 'Literal') {
            checkStringLiteral(node.value);
          } else if (node.value.type === 'JSXExpressionContainer' && 
                     node.value.expression.type === 'Literal') {
            checkStringLiteral(node.value.expression);
          }
        }
      },

      // Check template literals that might contain class names
      TemplateLiteral(node) {
        node.quasis.forEach(quasi => {
          if (quasi.value.raw) {
            checkStringLiteral({ value: quasi.value.raw });
          }
        });
      },

      // Check string literals in general (for utility functions)
      Literal(node) {
        if (typeof node.value === 'string' && 
            (node.value.includes('bg-') || 
             node.value.includes('text-') || 
             node.value.includes('border-'))) {
          checkStringLiteral(node);
        }
      },
    };
  },
}; 