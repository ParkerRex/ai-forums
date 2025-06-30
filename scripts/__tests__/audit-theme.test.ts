import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanFile, BANNED_PATTERNS } from '../audit-theme';
import * as fs from 'fs';

// Mock fs for testing
vi.mock('fs');

describe('audit-theme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BANNED_PATTERNS', () => {
    it('should detect bg-white', () => {
      const testString = 'className="bg-white text-center"';
      const matches = testString.match(BANNED_PATTERNS[0]);
      expect(matches).toContain('bg-white');
    });

    it('should detect bg-gray-* variants', () => {
      const testString = 'className="bg-gray-50 bg-gray-200 bg-gray-900"';
      const pattern = BANNED_PATTERNS.find(p => p.source.includes('bg-gray'));
      expect(pattern).toBeDefined();
      
      const matches = testString.match(pattern!);
      expect(matches).toBeTruthy();
    });

    it('should detect text-gray-* variants', () => {
      const testString = 'className="text-gray-600 text-gray-900"';
      const pattern = BANNED_PATTERNS.find(p => p.source.includes('text-gray'));
      expect(pattern).toBeDefined();
      
      const matches = testString.match(pattern!);
      expect(matches).toBeTruthy();
    });

    it('should detect border-gray-* variants', () => {
      const testString = 'className="border-gray-200 border-gray-300"';
      const pattern = BANNED_PATTERNS.find(p => p.source.includes('border-gray'));
      expect(pattern).toBeDefined();
      
      const matches = testString.match(pattern!);
      expect(matches).toBeTruthy();
    });
  });

  describe('scanFile', () => {
    it('should return empty array for clean file', () => {
      const cleanContent = `
import React from 'react';

export function Component() {
  return (
    <div className="bg-background text-foreground border">
      <p className="text-muted-foreground">Clean content</p>
    </div>
  );
}
`;
      vi.mocked(fs.readFileSync).mockReturnValue(cleanContent);

      const violations = scanFile('test.tsx');
      expect(violations).toHaveLength(0);
    });

    it('should detect violations in file', () => {
      const violatingContent = `
import React from 'react';

export function Component() {
  return (
    <div className="bg-white text-gray-900 border-gray-200">
      <p className="text-gray-600">Violating content</p>
    </div>
  );
}
`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const violations = scanFile('test.tsx');
      expect(violations.length).toBeGreaterThan(0);
      
      // Check that we found the specific violations
      const matches = violations.map(v => v.match);
      expect(matches).toContain('bg-white');
      expect(matches).toContain('text-gray-900');
      expect(matches).toContain('border-gray-200');
      expect(matches).toContain('text-gray-600');
    });

    it('should include correct line and column information', () => {
      const violatingContent = `line 1
<div className="bg-white">
line 3`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const violations = scanFile('test.tsx');
      expect(violations).toHaveLength(1);
      expect(violations[0].line).toBe(2);
      expect(violations[0].match).toBe('bg-white');
      expect(violations[0].context).toBe('<div className="bg-white">');
    });

    it('should handle file read errors gracefully', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const violations = scanFile('nonexistent.tsx');
      expect(violations).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should detect multiple violations on same line', () => {
      const violatingContent = `<div className="bg-white text-gray-900 border-gray-200">content</div>`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const violations = scanFile('test.tsx');
      expect(violations.length).toBe(3);
      
      const matches = violations.map(v => v.match);
      expect(matches).toContain('bg-white');
      expect(matches).toContain('text-gray-900');
      expect(matches).toContain('border-gray-200');
    });

    it('should not match partial words', () => {
      const content = `
        // This should not match: my-bg-white-custom
        <div className="my-bg-white-custom">
          <span className="prefix-text-gray-900-suffix">
            Should not trigger violations
          </span>
        </div>
      `;
      vi.mocked(fs.readFileSync).mockReturnValue(content);

      const violations = scanFile('test.tsx');
      expect(violations).toHaveLength(0);
    });
  });
}); 