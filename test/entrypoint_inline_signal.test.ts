import { describe, it, expect } from 'vitest';
import { computeSignals } from '../src/signals/compute_signals.js';
import type { ComputeSignalsInput } from '../src/signals/compute_signals.js';
import { fb } from './helpers/fixture_builder.js';

describe('entrypoint_inline_signal', () => {
  it('should include (→ ENTRYPOINT) in inline signals for an entrypoint file', () => {
    const fixture = fb()
      .imports('src/cli/main.ts', ['src/utils/helper.ts']);
    
    const graphInput = fixture.buildGraphInput();
    const renderInput = fixture.buildRenderInput();

    const input: ComputeSignalsInput = {
      files: graphInput.files,
      graph: renderInput.graph,
      parseResults: graphInput.parsed,
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const mainFile = result.files.find(f => f.file === 'src/cli/main.ts');
    
    expect(mainFile?.inline).toContainEqual({ kind: 'nav', code: 'ENTRYPOINT' });
  });

  it('should order signals correctly: (i ORPHAN) then (→ ENTRYPOINT)', () => {
    const fixture = fb()
      .file('src/cli/main.ts')
      .imports('src/cli/main.ts', ['src/external/dep.ts']);
    
    const graphInput = fixture.buildGraphInput();
    const renderInput = fixture.buildRenderInput();

    const input: ComputeSignalsInput = {
      files: graphInput.files,
      graph: renderInput.graph,
      parseResults: graphInput.parsed,
      fileMeta: {},
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const mainFile = result.files.find(f => f.file === 'src/cli/main.ts');
    
    const codes = mainFile?.inline.map(s => s.code);
    expect(codes).toEqual(['ORPHAN', 'ENTRYPOINT']);
  });

  it('should include (→ PUBLIC-API) for files with high fan-in and exports', () => {
    const fixture = fb()
      .file('src/api.ts')
      .imports('a.ts', ['src/api.ts'])
      .imports('b.ts', ['src/api.ts']);

    const graphInput = fixture.buildGraphInput();
    const renderInput = fixture.buildRenderInput();

    const input: ComputeSignalsInput = {
      files: graphInput.files,
      graph: renderInput.graph,
      parseResults: graphInput.parsed,
      fileMeta: {
        'src/api.ts': { depth: 0, exportCount: 5 }
      },
      budgets: { entrypointsTopN: 5, publicApiTopN: 5, hubsTopN: 5, inlinePerFileMax: 10 },
      thresholds: { bigLoc: 300, godFanIn: 15, deepPath: 3, barrelExports: 10 },
    };

    const result = computeSignals(input);
    const apiFile = result.files.find(f => f.file === 'src/api.ts');
    
    expect(apiFile?.inline).toContainEqual({ kind: 'nav', code: 'PUBLIC-API' });
  });
});
