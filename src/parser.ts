import { Token, Instruction, Program } from './types';
import { SourceToken, validateBrackets } from './lexer';

export function parse(tokens: SourceToken[]): Program {
  validateBrackets(tokens);

  const program: Program = [];
  const stack: Program[] = [program];

  for (let i = 0; i < tokens.length; i++) {
    const { token, position } = tokens[i];
    const current = stack[stack.length - 1];

    switch (token) {
      case Token.Plus:
      case Token.Minus: {
        // Collapse consecutive +/- into a single instruction
        let count = token === Token.Plus ? 1 : -1;
        while (
          i + 1 < tokens.length &&
          (tokens[i + 1].token === Token.Plus || tokens[i + 1].token === Token.Minus)
        ) {
          i++;
          count += tokens[i].token === Token.Plus ? 1 : -1;
        }
        if (count !== 0) {
          current.push({ op: Token.Plus, count, sourcePos: position });
        }
        break;
      }

      case Token.Right:
      case Token.Left: {
        // Collapse consecutive >/<  into a single instruction
        let count = token === Token.Right ? 1 : -1;
        while (
          i + 1 < tokens.length &&
          (tokens[i + 1].token === Token.Right || tokens[i + 1].token === Token.Left)
        ) {
          i++;
          count += tokens[i].token === Token.Right ? 1 : -1;
        }
        if (count !== 0) {
          current.push({ op: Token.Right, count, sourcePos: position });
        }
        break;
      }

      case Token.Read:
        current.push({ op: Token.Read, count: 1, sourcePos: position });
        break;

      case Token.Write:
        current.push({ op: Token.Write, count: 1, sourcePos: position });
        break;

      case Token.Open: {
        const loop: Instruction = {
          op: Token.Open,
          count: 1,
          innerOps: [],
          sourcePos: position,
        };
        current.push(loop);
        stack.push(loop.innerOps!);
        break;
      }

      case Token.Close:
        stack.pop();
        break;
    }
  }

  return program;
}
