import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";

function loadPureTypescript(file) {
  const mod = new Module(file);
  mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return mod.exports;
}
const { UI_EN, translateUi } = loadPureTypescript("lib/ui-language.ts");
const { WORKFLOW_ACTIONS, WORKFLOW_ROLES } = loadPureTypescript("lib/workflow-structure.ts");
const missing = new Set();
for (const file of ["components/inventory/InventoryWorkspace.tsx", "components/inventory/InventoryImport.tsx", "components/inventory/RoleHome.tsx", "components/inventory/HandoverReview.tsx", "app/workflow/page.tsx"]) {
  const tree = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "t" && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      const text = node.arguments[0].text.trim();
      if (/[\u0e00-\u0e7f]/.test(text) && !UI_EN[text]) missing.add(text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
for (const action of Object.values(WORKFLOW_ACTIONS)) if (!UI_EN[action.detail]) missing.add(action.detail);
for (const role of Object.values(WORKFLOW_ROLES)) for (const text of [role.scope, role.note]) if (!UI_EN[text]) missing.add(text);
assert.deepEqual([...missing], [], "All interface text needs an English translation");
for (const [th, en] of Object.entries(UI_EN)) assert.equal(translateUi(th, "en"), en);
assert.equal(translateUi("Unknown device name", "en"), "Unknown device name", "Do not translate business data");
assert.equal(translateUi("What would you like to do?", "th"), "คุณต้องการทำอะไร?");
const response = await fetch("http://localhost:3000/preview");
assert.equal(response.status, 200);
const html = await response.text();
assert.match(html, /<html[^>]*lang="en"/);
assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>EN<\/button>/);
assert.ok(html.includes("Devices"));
console.log(JSON.stringify({ translationEntries: Object.keys(UI_EN).length, missingTranslations: 0, defaultEnglish: true, previewHttpStatus: response.status }));
