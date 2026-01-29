const { writeFileSync } = require('fs');
const renderer = require('./dist/render/render_architecture_md.js');

// Build a minimal RenderInput matching the test fixture
const files = [
  'src/a.ts','src/b.ts','src/api.ts','src/x.ts','src/api2.ts',
  'src/more_api_1.ts','src/more_api_2.ts','src/more_api_3.ts','src/more_api_4.ts','src/more_api_5.ts'
];

// Tree: simple flat tree under src
const root = { kind: 'dir', name: '', relPath: '.', children: [] };
const srcDir = { kind: 'dir', name: 'src', relPath: 'src', children: [] };
root.children.push(srcDir);
for (const f of files) {
  const parts = f.split('/');
  const name = parts[parts.length-1];
  srcDir.children.push({ kind: 'file', name, relPath: f, ext: name.includes('.') ? name.split('.').pop() : '' });
}

// Graph
const nodes = new Map();
for (const f of files) {
  nodes.set(f, { id: f, outgoing: new Set(), incoming: new Set(), externals: new Set() });
}
// edges: a -> b, a -> x, a -> more_api_i
nodes.get('src/a.ts').outgoing.add('src/b.ts');
nodes.get('src/b.ts').incoming.add('src/a.ts');

nodes.get('src/a.ts').outgoing.add('src/x.ts');
nodes.get('src/x.ts').incoming.add('src/a.ts');

for (let i=1;i<=5;i++){
  const m = `src/more_api_${i}.ts`;
  nodes.get('src/a.ts').outgoing.add(m);
  nodes.get(m).incoming.add('src/a.ts');
}
// b -> api
nodes.get('src/b.ts').outgoing.add('src/api.ts');
nodes.get('src/api.ts').incoming.add('src/b.ts');
// x -> api2
nodes.get('src/x.ts').outgoing.add('src/api2.ts');
nodes.get('src/api2.ts').incoming.add('src/x.ts');

const graph = { nodes, cycles: [] };

// Signals: mark api.ts, api2.ts and more_api_* as PUBLIC-API
const publicApis = ['src/api.ts','src/api2.ts','src/more_api_1.ts','src/more_api_2.ts','src/more_api_3.ts','src/more_api_4.ts','src/more_api_5.ts'];
const signals = {
  files: publicApis.map(f => ({ file: f, inline: [{ kind: 'nav', code: 'PUBLIC-API' }] })),
  entrypoints: [],
  // publicApi and hubs arrays expect objects with { file, reason }
  publicApi: publicApis.map(f => ({ file: f, reason: 'detected' })),
  hubsFanIn: [],
  hubsFanOut: [],
  warnings: []
};

const ri = { tree: root, graph, signals };

const out = renderer.renderArchitectureMd(ri, { focusFile: 'src/a.ts' });
writeFileSync('tmp_impact_budgeted.md', out.content, 'utf8');
const outFull = renderer.renderArchitectureMd(ri, { focusFile: 'src/a.ts', fullSignals: true });
writeFileSync('tmp_impact_full.md', outFull.content, 'utf8');
console.log('Wrote tmp_impact_budgeted.md and tmp_impact_full.md');
