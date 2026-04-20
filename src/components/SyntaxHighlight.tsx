import { useMemo } from "react";

interface Token {
  type:
    | "keyword"
    | "function"
    | "string"
    | "number"
    | "comment"
    | "operator"
    | "text";
  value: string;
}

const KEYWORDS = new Set([
  "setcps",
  "stack",
  "note",
  "s",
  "gain",
  "velocity",
  "bank",
  "delay",
  "delaytime",
  "room",
  "lpf",
  "hpf",
  "distort",
  "crush",
  "pan",
  "rev",
  "slow",
  "fast",
  "degradeBy",
  "every",
  "swing",
  "struct",
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Comments
    if (code[i] === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const value = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: "comment", value });
      i += value.length;
      continue;
    }

    // Strings
    if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Numbers
    if (
      /\d/.test(code[i]) ||
      (code[i] === "." && /\d/.test(code[i + 1] ?? ""))
    ) {
      let j = i;
      while (j < code.length && /[\d.]/.test(code[j])) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers / keywords / functions
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      // Check if followed by ( to mark as function
      const nextNonSpace = code.slice(j).match(/^\s*\(/);
      if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (nextNonSpace) {
        tokens.push({ type: "function", value: word });
      } else {
        tokens.push({ type: "text", value: word });
      }
      i = j;
      continue;
    }

    // Operators
    if ("(){}[],;.=>+-*/%!&|^~?:".includes(code[i])) {
      tokens.push({ type: "operator", value: code[i] });
      i++;
      continue;
    }

    // Whitespace and other
    let j = i;
    while (
      j < code.length &&
      !/[a-zA-Z0-9_$"'`/.(){}[\],;=>+\-*%!&|^~?:]/.test(code[j])
    ) {
      j++;
    }
    if (j === i) j = i + 1;
    tokens.push({ type: "text", value: code.slice(i, j) });
    i = j;
  }

  return tokens;
}

interface SyntaxHighlightProps {
  code: string;
}

export function SyntaxHighlight({ code }: SyntaxHighlightProps) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <code>
      {tokens.map((token, i) => (
        <span key={i} className={`sh-${token.type}`}>
          {token.value}
        </span>
      ))}
    </code>
  );
}
