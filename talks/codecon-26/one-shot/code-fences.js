function splitFencedCode(text) {
  const fence = /^ {0,3}(`{3,})([^`\n]*)\n([\s\S]*?)^ {0,3}\1`*[ \t]*(?=\n|$)/gm;
  const parts = [];
  let end = 0;
  for (const match of text.matchAll(fence)) {
    parts.push({ type: 'text', value: text.slice(end, match.index) });
    parts.push({ type: 'code', value: match[3], language: match[2].trim().split(/\s+/)[0] });
    end = match.index + match[0].length;
  }
  parts.push({ type: 'text', value: text.slice(end) });
  return parts;
}

if (typeof module !== 'undefined') module.exports = splitFencedCode;
