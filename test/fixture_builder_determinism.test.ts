import { describe, it, expect } from 'vitest';
import { fb } from './helpers/fixture_builder.js';
import { stableJsonStringify } from '../src/utils/determinism.js';

describe('FixtureBuilder Determinism', () => {
    it('builds the same fixture twice deterministically', () => {
        const createFixture = () => fb()
            .dir('src')
            .dir('src/cli')
            .file('src/cli/main.ts')
            .makeMany('src/hubs', { files: 5, prefix: 'hub_', ext: '.ts' })
            .chain('src/deep', 3)
            .imports('src/a.ts', ['src/b.ts', 'src/c.ts'])
            .signal('src/deep/risk.ts', '! CYCLE')
            .signal('src/cli/main.ts', '→ ENTRYPOINT')
            .buildRenderInput();

        const input1 = createFixture();
        const input2 = createFixture();

        expect(stableJsonStringify(input1)).toBe(stableJsonStringify(input2));
    });

    it('builds the same fixture with different insertion order deterministically', () => {
        const input1 = fb()
            .dir('b')
            .dir('a')
            .file('b/f2.ts')
            .file('a/f1.ts')
            .buildRenderInput();

        const input2 = fb()
            .file('a/f1.ts')
            .file('b/f2.ts')
            .dir('a')
            .dir('b')
            .buildRenderInput();

        expect(stableJsonStringify(input1)).toBe(stableJsonStringify(input2));
    });
});
