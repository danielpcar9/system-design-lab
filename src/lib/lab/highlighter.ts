export type TokKind =
  | "kw"
  | "str"
  | "cm"
  | "fn"
  | "type"
  | "num"
  | "sym"
  | "dec"
  | "plain";

export type Token = { k: TokKind; t: string };
export type SnippetLang = "ruby" | "python" | "sh";

const RUBY_KW = new Set([
  "class",
  "module",
  "def",
  "end",
  "if",
  "elsif",
  "else",
  "unless",
  "case",
  "when",
  "begin",
  "rescue",
  "ensure",
  "do",
  "return",
  "yield",
  "self",
  "nil",
  "true",
  "false",
  "and",
  "or",
  "not",
  "next",
  "break",
  "alias",
  "super",
  "require",
  "require_relative",
  "include",
  "extend",
  "private",
  "protected",
  "public",
  "lambda",
  "proc",
  "gem",
  "source",
  "ruby",
]);

const PY_KW = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "False",
  "try",
  "while",
  "with",
  "yield",
]);

const SH_KW = new Set([
  "uv",
  "init",
  "add",
  "run",
  "rv",
  "install",
  "bundle",
  "bin/rails",
  "rails",
  "server",
]);

function tokenizeLine(line: string, lang: SnippetLang): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = line.length;
  const push = (k: TokKind, t: string) => {
    if (t.length) out.push({ k, t });
  };

  while (i < n) {
    const ch = line[i];

    if (ch === "#") {
      push("cm", line.slice(i));
      break;
    }

    if (ch === '"' || ch === "'" || (ch === "%" && lang === "ruby")) {
      if (ch === "%" && lang === "ruby") {
        const nxt = line[i + 1];
        if (nxt === "q" || nxt === "Q" || nxt === "w" || nxt === "{" || nxt === "/") {
          // fall through
        } else {
          push("plain", ch);
          i += 1;
          continue;
        }
      }
      const quote = ch;
      let j = i + 1;
      let buf = quote;
      while (j < n) {
        buf += line[j];
        if (line[j] === "\\" && j + 1 < n) {
          buf += line[j + 1];
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      push("str", buf);
      i = j;
      continue;
    }

    if (/\d/.test(ch)) {
      let j = i;
      while (j < n && /[\d._]/.test(line[j] ?? "")) j += 1;
      push("num", line.slice(i, j));
      i = j;
      continue;
    }

    if (/[A-Za-z_./]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_?!./-]/.test(line[j] ?? "")) j += 1;
      const word = line.slice(i, j);
      const kw = lang === "ruby" ? RUBY_KW : lang === "sh" ? SH_KW : PY_KW;
      if (kw.has(word)) {
        push("kw", word);
      } else if (/^[A-Z]/.test(word)) {
        push("type", word);
      } else if (j < n && line[j] === "(") {
        push("fn", word);
      } else {
        push("plain", word);
      }
      i = j;
      continue;
    }

    if ("=<>!&|+-*:".includes(ch)) {
      push("sym", ch);
      i += 1;
      continue;
    }

    push("plain", ch);
    i += 1;
  }

  return out;
}

export function tokenize(code: string, lang: SnippetLang): Token[][] {
  return code.replace(/\n$/, "").split("\n").map((line) => tokenizeLine(line, lang));
}
