import { Token } from './types';

export interface SourceToken {
  token: Token;
  position: number;
  line: number;
  column: number;
}

const TOKEN_MAP: Record<string, Token> = {
  '+': Token.Plus,
  '-': Token.Minus,
  '>': Token.Right,
  '<': Token.Left,
  '[': Token.Open,
  ']': Token.Close,
  ',': Token.Read,
  '.': Token.Write,
};

const VALID_CHARS = new Set(Object.keys(TOKEN_MAP));

export function tokenize(source: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  let line = 1;
  let column = 1;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === '\n') {
      line++;
      column = 1;
      continue;
    }

    if (VALID_CHARS.has(char)) {
      tokens.push({
        token: TOKEN_MAP[char],
        position: i,
        line,
        column,
      });
    }
    // Everything else is treated as a comment and filtered out

    column++;
  }

  return tokens;
}

export function validateBrackets(tokens: SourceToken[]): void {
  const stack: SourceToken[] = [];

  for (const t of tokens) {
    if (t.token === Token.Open) {
      stack.push(t);
    } else if (t.token === Token.Close) {
      if (stack.length === 0) {
        throw new Error(
          `Unmatched closing bracket at line ${t.line}, column ${t.column} (position ${t.position})`
        );
      }
      stack.pop();
    }
  }

  if (stack.length > 0) {
    const unmatched = stack[stack.length - 1];
    throw new Error(
      `Unmatched opening bracket at line ${unmatched.line}, column ${unmatched.column} (position ${unmatched.position})`
    );
  }
}
