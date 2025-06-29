#!/usr/bin/env node

import * as fs from 'fs';
import { glob } from 'glob';

// Banned Tailwind color classes that should use semantic tokens instead
const BANNED_PATTERNS = [
  // Background colors
  /\bbg-white\b/g,
  /\bbg-black(?!\/)/g, // Allow bg-black/opacity but not plain bg-black
  /\bbg-gray-\d+\b/g,
  /\bbg-slate-\d+\b/g,
  /\bbg-zinc-\d+\b/g,
  /\bbg-neutral-\d+\b/g,
  /\bbg-stone-\d+\b/g,
  
  // Text colors
  /\btext-white(?!\s+shadow|\s+\[a&\])/g, // Allow text-white for destructive buttons with shadows/hover states
  /\btext-black\b/g,
  /\btext-gray-\d+\b/g,
  /\btext-slate-\d+\b/g,
  /\btext-zinc-\d+\b/g,
  /\btext-neutral-\d+\b/g,
  /\btext-stone-\d+\b/g,
  
  // Border colors
  /\bborder-white\b/g,
  /\bborder-black\b/g,
  /\bborder-gray-\d+\b/g,
  /\bborder-slate-\d+\b/g,
  /\bborder-zinc-\d+\b/g,
  /\bborder-neutral-\d+\b/g,
  /\bborder-stone-\d+\b/g,
];

interface Violation {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      BANNED_PATTERNS.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          violations.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            match: match[0],
            context: line.trim()
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  
  return violations;
}

async function auditTheme(): Promise<void> {
  console.log('🎨 Auditing theme compliance...\n');
  
  // Find all TSX and CSS files, excluding node_modules and build directories
  const patterns = [
    'app/**/*.{tsx,css}',
    'components/**/*.{tsx,css}',
    'lib/**/*.{tsx,css}',
    'hooks/**/*.{tsx,css}',
    '*.{tsx,css}'
  ];
  
  const ignorePatterns = [
    'node_modules/**',
    '.next/**',
    'dist/**',
    'build/**',
    '**/*.d.ts'
  ];
  
  const allViolations: Violation[] = [];
  
  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, { ignore: ignorePatterns });
      
      for (const file of files) {
        const violations = scanFile(file);
        allViolations.push(...violations);
      }
    } catch (error) {
      console.error(`Error processing pattern ${pattern}:`, error);
    }
  }
  
  // Report results
  if (allViolations.length === 0) {
    console.log('✅ No theme violations found!');
    process.exit(0);
  }
  
  console.log(`❌ Found ${allViolations.length} theme violations:\n`);
  
  // Group violations by file
  const violationsByFile = allViolations.reduce((acc, violation) => {
    if (!acc[violation.file]) {
      acc[violation.file] = [];
    }
    acc[violation.file].push(violation);
    return acc;
  }, {} as Record<string, Violation[]>);
  
  // Print violations grouped by file
  Object.entries(violationsByFile).forEach(([file, violations]) => {
    console.log(`📁 ${file}:`);
    violations.forEach(violation => {
      console.log(`  Line ${violation.line}:${violation.column} - "${violation.match}"`);
      console.log(`    ${violation.context}`);
    });
    console.log('');
  });
  
  console.log('Suggested replacements:');
  console.log('  bg-white → bg-background');
  console.log('  bg-gray-50 → bg-muted');
  console.log('  bg-gray-200 → bg-muted opacity-50 (for skeletons)');
  console.log('  text-gray-900 → text-foreground');
  console.log('  text-gray-600 → text-muted-foreground');
  console.log('  border-gray-200 → border');
  console.log('');
  
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  auditTheme().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

export { auditTheme, scanFile, BANNED_PATTERNS }; 