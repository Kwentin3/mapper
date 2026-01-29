import { describe, it, expect } from 'vitest';
import { renderArchitectureMd } from '../src/render/render_architecture_md.js';
import { fb } from './helpers/fixture_builder.js';

describe('render: Local Dependencies legend', () => {
  it('inserts legend line immediately after the Local Dependencies header and is deterministic', () => {
    const fixture = fb();
    // Create a small graph that will produce Local Dependencies
    fixture.file('src/a.ts');
    fixture.imports('src/b.ts', ['./api.ts']);
    fixture.imports('src/a.ts', ['./b.ts']);
    fixture.file('src/api.ts');

    const ri = fixture.buildRenderInput();
    const out1 = renderArchitectureMd(ri, {});
    const out2 = renderArchitectureMd(ri, {});
    const md = out1.content;

    const header = '## Local Dependencies (Budgeted)';
    const legend = 'Списки отсортированы лексикографически по POSIX (repo-relative). Показаны первые N зависимостей; используйте --full-signals для полного списка.';

    expect(md).toContain(header);
    // The legend must appear immediately after the header
    expect(md).toContain(`${header}\n${legend}`);

    // Legend appears exactly once
    const occurrences = md.split(legend).length - 1;
    expect(occurrences).toBe(1);

    // Deterministic: two renders are identical
    expect(out1.content).toBe(out2.content);
  });
});
