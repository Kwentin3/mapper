import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import { fb } from './helpers/fixture_builder.js';

// Ensure deterministic ordering when multiple equal-length paths exist
describe('render: Impact Path — ordering determinism', () => {
  it('orders equal-length paths by lexicographic rendered path string', () => {
    const fixture = fb();
    // src/a -> src/x -> src/api1
    // src/a -> src/y -> src/api2
    fixture.imports('src/a.ts', ['./x.ts', './y.ts']);
    fixture.imports('src/x.ts', ['./api1.ts']);
    fixture.imports('src/y.ts', ['./api2.ts']);
    fixture.file('src/api1.ts');
    fixture.signal('src/api1.ts', '→ PUBLIC-API');
    fixture.file('src/api2.ts');
    fixture.signal('src/api2.ts', '→ PUBLIC-API');

    const ri = fixture.buildRenderInput();
    const out = renderArchitectureMd(ri, { focusFile: 'src/a.ts' });
    const md = out.content;

    expect(md).toContain('## Impact Path');

    const pathA = '`src/a.ts` → `src/x.ts` → `src/api1.ts` (→ PUBLIC-API)';
    const pathB = '`src/a.ts` → `src/y.ts` → `src/api2.ts` (→ PUBLIC-API)';

    expect(md).toContain(pathA);
    expect(md).toContain(pathB);

    // Ensure ordering in the markdown matches lexicographic order of the rendered strings
    const idxA = md.indexOf(pathA);
    const idxB = md.indexOf(pathB);
    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxA).toBeLessThan(idxB); // x comes before y lexicographically
  });
});
