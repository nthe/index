import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
const splitFencedCode = createRequire(import.meta.url)("./code-fences.js");
const folder = new URL(".", import.meta.url);
const [page, session] = await Promise.all([
  readFile(new URL("index.html", folder), "utf8"),
  readFile(new URL("session.html", folder), "utf8"),
]);

assert.ok(page.includes("Build a native extension, plugin or hook"));
assert.ok(page.includes('href="session.html"'));
assert.ok(page.includes('href="../"') && page.includes('href="../../.."'));
assert.ok(session.includes('href="../"') && session.includes('href="../../.."'));
assert.equal((session.match(/<article class="entry /g) ?? []).length, 166);
assert.equal((session.match(/<details class="tool-call"/g) ?? []).length, 94);
assert.equal((session.match(/<details class="tool-output"/g) ?? []).length, 94);
assert.ok(session.includes("search.addEventListener('input', update)"));
assert.ok(session.includes("roleFilter.addEventListener('change', update)"));
assert.ok(session.includes("item.open = open"));
assert.deepEqual(splitFencedCode("Before\n```sh\necho '<script>'\n```\nAfter"), [
  { type: "text", value: "Before\n" },
  { type: "code", value: "echo '<script>'\n", language: "sh" },
  { type: "text", value: "\nAfter" },
]);
assert.deepEqual(splitFencedCode("````js\n```\ninside\n```\n````"), [
  { type: "text", value: "" },
  { type: "code", value: "```\ninside\n```\n", language: "js" },
  { type: "text", value: "" },
]);
assert.deepEqual(splitFencedCode("Unclosed\n```sh\necho hi"), [{ type: "text", value: "Unclosed\n```sh\necho hi" }]);

const element = (properties = {}) => ({
  ...properties,
  listeners: {},
  addEventListener(event, callback) { this.listeners[event] = callback; },
  fire(event, data) { this.listeners[event](data); },
});
const search = element({ value: "", focus() {} });
const choices = [...session.matchAll(/<label><input type="checkbox" name="role" value="([^"]+)"( checked)?> ([^<]+)<\/label>/g)]
  .map(([, value, checked, text]) => ({ value, checked: Boolean(checked), parentElement: { textContent: text } }));
assert.deepEqual(choices.map(({ value, checked }) => [value, checked]), [
  ["user", true], ["assistant", true], ["toolResult", false],
]);
const summary = { focused: false, focus() { this.focused = true; } };
const roleFilter = element({
  querySelectorAll: selector => { assert.equal(selector, 'input[name="role"]'); return choices; },
  querySelector: () => summary,
  contains: target => target === roleFilter,
});
const roleSelection = element();
assert.match(session, /id="hide-tool-calls" checked> Hide tool calls/);
const hideToolCalls = element({ checked: true });
const toolCallStatus = element();
const makeEntry = (id, role, content, callText = "") => {
  const calls = callText ? [{ textContent: callText, open: false }] : [];
  return {
    id, dataset: { role }, textContent: `${role} ${content} ${callText}`,
    calls,
    querySelector: () => ({ textContent: role }),
    querySelectorAll: selector => selector === '.tool-call' ? calls : content ? [{ textContent: content }] : [],
  };
};
const entries = [
  makeEntry("user", "user", "A prompt"),
  makeEntry("assistant-text", "assistant", "An answer"),
  makeEntry("assistant-call", "assistant", "", "Tool call needle"),
  makeEntry("assistant-mixed", "assistant", "Mixed answer", "Tool call needle"),
  makeEntry("tool-result", "toolResult", "Tool output"),
];
const details = [...entries.flatMap(entry => entry.calls), { open: false }];
const count = element();
const empty = element({ style: {} });
const expand = element({ dataset: {} });
const clear = element();
const nodes = { "#search": search, "#role-filter": roleFilter, "#role-selection": roleSelection, "#hide-tool-calls": hideToolCalls, "#tool-call-status": toolCallStatus, "#count": count, "#empty": empty, "#expand": expand, "#clear": clear };
const document = element({
  querySelector: (selector) => nodes[selector],
  querySelectorAll: (selector) => {
    if (selector === ".entry") return entries;
    if (selector === ".entry-copy") return [];
    assert.equal(selector, ".tool-call, .tool-output");
    return details;
  },
});
const script = session.slice(session.lastIndexOf("<script>") + 8, session.lastIndexOf("</script>"));
runInNewContext(script, { document, splitFencedCode });
const visible = () => entries.filter(entry => !entry.hidden).map(entry => entry.id);
assert.deepEqual(visible(), ["user", "assistant-text", "assistant-mixed"]);
assert.equal(roleSelection.textContent, "User, Assistant");
assert.equal(entries[3].calls[0].hidden, true);
assert.equal(toolCallStatus.hidden, false);
search.value = "needle";
search.fire("input");
assert.deepEqual(visible(), []);
search.value = "mixed answer";
search.fire("input");
assert.deepEqual(visible(), ["assistant-mixed"]);
hideToolCalls.checked = false;
search.value = "needle";
roleFilter.fire("change");
assert.deepEqual(visible(), ["assistant-call", "assistant-mixed"]);
assert.equal(entries[3].calls[0].hidden, false);
search.value = "";
search.fire("input");
roleFilter.open = true;
document.fire("click", { target: roleFilter });
assert.equal(roleFilter.open, true);
document.fire("click", { target: search });
assert.equal(roleFilter.open, false);
roleFilter.open = true;
document.fire("keydown", { key: "Escape" });
assert.equal(roleFilter.open, false);
assert.equal(summary.focused, true);
choices[2].checked = true;
roleFilter.fire("change");
assert.deepEqual(visible(), ["user", "assistant-text", "assistant-call", "assistant-mixed", "tool-result"]);
assert.equal(roleSelection.textContent, "All roles");
choices.forEach(choice => { choice.checked = false; });
roleFilter.fire("change");
assert.deepEqual(visible(), []);
assert.equal(empty.style.display, "block");
assert.equal(roleSelection.textContent, "None");
choices[2].checked = true;
roleFilter.fire("change");
search.value = "OUTPUT";
search.fire("input");
assert.deepEqual(visible(), ["tool-result"]);
search.value = "missing";
search.fire("input");
assert.deepEqual(visible(), []);
clear.fire("click");
assert.deepEqual(visible(), ["tool-result"]);
expand.fire("click");
assert.ok(details.every(detail => detail.open));
expand.fire("click");
assert.ok(details.every(detail => !detail.open));

console.log("Session page and filter checks passed.");
