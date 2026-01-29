import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import { fb } from './helpers/fixture_builder.js';

describe('render: Impact Path — no reachable PUBLIC-API', () => {
  it('renders a canonical no-public-api line when none reachable', () => {
    const fixture = fb();
    fixture.imports('src/a.ts', ['./b.ts']);
    fixture.file('src/b.ts');
    // no PUBLIC-API signals
    const ri = fixture.buildRenderInput();

    const out = renderArchitectureMd(ri, { focusFile: 'src/a.ts' });
    const md = out.content;

    expect(md).toContain('## Impact Path');
    expect(md).toContain('No PUBLIC-API reachable from src/a.ts.');
  });
});
