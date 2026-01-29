// Regex-only contract anchor scanner.
// - Strips comments and string literals (including template literals) deterministically
// - Runs a small, fixed allowlist of anchor regexes

export type ContractAnchors = {
  hasInput: boolean;
  hasOutput: boolean;
  inputAnchors: string[];
  outputAnchors: string[];
};

function isEscaped(text: string, idx: number): boolean {
  // Count backslashes immediately preceding idx
  let backslashes = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (text[i] === "\\") backslashes++; else break;
  }
  return backslashes % 2 === 1;
}

function stripCommentsAndStrings(src: string): string {
  const len = src.length;
  let i = 0;
  const out: string[] = [];
  while (i < len) {
    const ch = src[i];
    // Line comment
    if (ch === '/' && i + 1 < len && src[i + 1] === '/') {
      out.push(' ', ' ');
      i += 2;
      while (i < len && src[i] !== '\n') { out.push(' '); i++; }
      // preserve newline
      if (i < len && src[i] === '\n') { out.push('\n'); i++; }
      continue;
    }
    // Block comment
    if (ch === '/' && i + 1 < len && src[i + 1] === '*') {
      out.push(' ', ' ');
      i += 2;
      while (i < len) {
        if (src[i] === '*' && i + 1 < len && src[i + 1] === '/') {
          out.push(' ', ' ');
          i += 2;
          break;
        }
        // preserve newlines
        if (src[i] === '\n') out.push('\n'); else out.push(' ');
        i++;
      }
      continue;
    }
    // Single-quoted string
    if (ch === "'") {
      out.push(' ');
      i++;
      while (i < len) {
        if (src[i] === '\n') { out.push('\n'); i++; continue; }
        if (src[i] === "'" && !isEscaped(src, i)) { out.push(' '); i++; break; }
        // replace inner with spaces
        out.push(' ');
        i++;
      }
      continue;
    }
    // Double-quoted string
    if (ch === '"') {
      out.push(' ');
      i++;
      while (i < len) {
        if (src[i] === '\n') { out.push('\n'); i++; continue; }
        if (src[i] === '"' && !isEscaped(src, i)) { out.push(' '); i++; break; }
        out.push(' ');
        i++;
      }
      continue;
    }
    // Template literal (backticks) — ignore entire template including interpolations
    if (ch === '`') {
      out.push(' ');
      i++;
      while (i < len) {
        if (src[i] === '`' && !isEscaped(src, i)) { out.push(' '); i++; break; }
        if (src[i] === '\n') { out.push('\n'); i++; continue; }
        out.push(' ');
        i++;
      }
      continue;
    }

    // default: copy char
    out.push(ch);
    i++;
  }

  return out.join('');
}

export function scanContractAnchors(sourceText: string): ContractAnchors {
  const sanitized = stripCommentsAndStrings(sourceText);

  // Anchor allowlist
  const inputPatterns: Array<[string, RegExp]> = [
    ['inputSchema', /\binputSchema\b/g],
    ['payloadSchema', /\bpayloadSchema\b/g],
    ['RequestDTO', /\b(RequestDTO|InputDTO)\b/g],
    ['zodObject', /\bz\.object\s*\(/g],
    ['zodParse', /\b(safeParse|parse)\s*\(/g],
  ];

  const outputPatterns: Array<[string, RegExp]> = [
    ['responseSchema', /\bresponseSchema\b/g],
    ['ResponseDTO', /\b(ResponseDTO|OutputDTO)\b/g],
    ['resultDTO', /\bResult\s*<\s*\w+DTO\s*>/g],
    ['schemaParseReturn', /\breturn\s+\w+Schema\.(safeParse|parse)\s*\(/g],
  ];

  const inputSet = new Set<string>();
  const outputSet = new Set<string>();

  for (const [key, re] of inputPatterns) {
    if (re.test(sanitized)) inputSet.add(key);
  }

  for (const [key, re] of outputPatterns) {
    if (re.test(sanitized)) outputSet.add(key);
  }

  // deterministic arrays
  const inputAnchors = Array.from(inputSet).sort((a, b) => a.localeCompare(b));
  const outputAnchors = Array.from(outputSet).sort((a, b) => a.localeCompare(b));

  return {
    hasInput: inputAnchors.length > 0,
    hasOutput: outputAnchors.length > 0,
    inputAnchors,
    outputAnchors,
  };
}

export default scanContractAnchors;
