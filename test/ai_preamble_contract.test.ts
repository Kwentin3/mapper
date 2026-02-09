import { describe, it, expect } from 'vitest';
import { AI_PREAMBLE } from '../src/render/preamble.js';

describe('AI preamble contract', () => {
    it('contains required headings and canonical signal priority', () => {
        expect(AI_PREAMBLE).toMatch(/^## AI Preamble — How to Use This Map/);
        expect(AI_PREAMBLE).toContain('### Navigation Strategy');
        expect(AI_PREAMBLE).toContain('### Signal Priority');
        // Exact canonical order with arrows
        expect(AI_PREAMBLE).toContain('(!) → (?) → (i) → (→)');
        expect(AI_PREAMBLE).toContain('### ORPHAN guidance');
        expect(AI_PREAMBLE).toMatch(/ORPHAN means "no repo-local importers"/);
        expect(AI_PREAMBLE).toMatch(/ORPHAN is not automatically safe/);
        // New required clarifications: summary markers and budgeting
        expect(AI_PREAMBLE).toContain('### Summary markers & budgeting');
        expect(AI_PREAMBLE).toContain('[PROD] / [TEST]');
        expect(AI_PREAMBLE).toContain('--full-signals');
        // UX contract: clarify summary entrypoints vs inline (→ ENTRYPOINT)
        expect(AI_PREAMBLE).toContain('Summary "### Entrypoints" lists [PROD] entrypoints');
        expect(AI_PREAMBLE).toContain('inline (→ ENTRYPOINT) can also appear on [TEST] files with fan-in 0');
        // UX contract: agent interpretation rules link must be present in the artifact
        expect(AI_PREAMBLE).toContain('docs/agent-interpretation.md');
    });
});
