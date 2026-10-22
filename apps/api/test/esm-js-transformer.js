/**
 * Transformador Jest mínimo para dependencias publicadas como ESM
 * (`@scure/base` vía `otplib`). Convierte el JS a CommonJS con TypeScript.
 */
const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        allowJs: true,
        moduleResolution: ts.ModuleResolutionKind.Node10,
      },
      fileName: sourcePath,
    });

    return { code: result.outputText };
  },
};
