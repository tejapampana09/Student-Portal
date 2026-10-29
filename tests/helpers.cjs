const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Run the real TypeScript handlers with deterministic DB/network adapters.
// No portal requests, real credentials, or live MongoDB are used by this suite.
function load(file, mocks = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '..', file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, mod);
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`, mocks, cache);
    return originalRequire(id);
  };
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
    reportDiagnostics: true,
  });
  const errors = result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: x => x, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
  }));
  mod._compile(result.outputText, filename);
  return mod.exports;
}
class NextResponse extends Response {
  static json(body, init) {
    return new NextResponse(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  }
}
const request = (body, token = 'token') => ({ headers: new Headers({ Authorization: `Bearer ${token}` }), json: async () => body });
const errorResponse = (message, data = {}, status = 400) => NextResponse.json({ success: false, message, ...data }, { status });
module.exports = { load, NextResponse, request, errorResponse };
