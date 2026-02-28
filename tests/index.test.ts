import { describe, it, expect } from 'vitest';
import { tokenize, validateBrackets } from '../src/lexer';
import { parse } from '../src/parser';
import { Interpreter } from '../src/interpreter';
import { Token } from '../src/types';

describe('Lexer - tokenize', () => {
  it('tokenizes basic brainfuck characters', () => {
    const tokens = tokenize('+-><[],.');
    expect(tokens).toHaveLength(8);
    expect(tokens.map((t) => t.token)).toEqual([
      Token.Plus,
      Token.Minus,
      Token.Right,
      Token.Left,
      Token.Open,
      Token.Close,
      Token.Read,
      Token.Write,
    ]);
  });

  it('ignores comments and non-brainfuck characters', () => {
    const tokens = tokenize('hello + world - test');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].token).toBe(Token.Plus);
    expect(tokens[1].token).toBe(Token.Minus);
  });

  it('tracks line and column numbers', () => {
    const tokens = tokenize('+\n>');
    expect(tokens[0].line).toBe(1);
    expect(tokens[0].column).toBe(1);
    expect(tokens[1].line).toBe(2);
    expect(tokens[1].column).toBe(1);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for input with only comments', () => {
    expect(tokenize('this is just text')).toEqual([]);
  });
});

describe('Lexer - validateBrackets', () => {
  it('passes for balanced brackets', () => {
    const tokens = tokenize('[++[-]]');
    expect(() => validateBrackets(tokens)).not.toThrow();
  });

  it('throws for unmatched opening bracket', () => {
    const tokens = tokenize('[++');
    expect(() => validateBrackets(tokens)).toThrow('Unmatched opening bracket');
  });

  it('throws for unmatched closing bracket', () => {
    const tokens = tokenize('++]');
    expect(() => validateBrackets(tokens)).toThrow('Unmatched closing bracket');
  });

  it('passes for nested brackets', () => {
    const tokens = tokenize('[[[]]]');
    expect(() => validateBrackets(tokens)).not.toThrow();
  });
});

describe('Parser', () => {
  it('parses simple instructions', () => {
    const tokens = tokenize('+>.');
    const program = parse(tokens);
    expect(program).toHaveLength(3);
    expect(program[0].op).toBe(Token.Plus);
    expect(program[0].count).toBe(1);
    expect(program[1].op).toBe(Token.Right);
    expect(program[1].count).toBe(1);
    expect(program[2].op).toBe(Token.Write);
  });

  it('collapses consecutive plus/minus operations', () => {
    const tokens = tokenize('+++--');
    const program = parse(tokens);
    // +++ = 3, -- = -2, net = 1
    expect(program).toHaveLength(1);
    expect(program[0].op).toBe(Token.Plus);
    expect(program[0].count).toBe(1);
  });

  it('collapses consecutive right/left operations', () => {
    const tokens = tokenize('>>><<');
    const program = parse(tokens);
    expect(program).toHaveLength(1);
    expect(program[0].op).toBe(Token.Right);
    expect(program[0].count).toBe(1); // 3 - 2 = 1
  });

  it('parses loops with innerOps', () => {
    const tokens = tokenize('[+>]');
    const program = parse(tokens);
    expect(program).toHaveLength(1);
    expect(program[0].op).toBe(Token.Open);
    expect(program[0].innerOps).toBeDefined();
    expect(program[0].innerOps!).toHaveLength(2);
    expect(program[0].innerOps![0].op).toBe(Token.Plus);
    expect(program[0].innerOps![1].op).toBe(Token.Right);
  });

  it('handles nested loops', () => {
    const tokens = tokenize('[+[-]]');
    const program = parse(tokens);
    expect(program).toHaveLength(1);
    const outer = program[0];
    expect(outer.innerOps).toHaveLength(2);
    // First inner op is +
    expect(outer.innerOps![0].op).toBe(Token.Plus);
    // Second inner op is the nested loop
    const inner = outer.innerOps![1];
    expect(inner.op).toBe(Token.Open);
    expect(inner.innerOps).toHaveLength(1);
    expect(inner.innerOps![0].op).toBe(Token.Plus);
    expect(inner.innerOps![0].count).toBe(-1); // It's a minus (collapsed)
  });
});

describe('Interpreter', () => {
  it('runs a simple "Hello World" program', () => {
    // This is a classic brainfuck "Hello World!" program
    const source =
      '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter({ maxSteps: 100000 });
    const output = interpreter.run(program);

    expect(output).toBe('Hello World!\n');
  });

  it('handles input via the comma instruction', () => {
    // Read two chars and print them reversed
    // ,>,.<.  -> read A, move right, read B, write B, move left, write A
    const source = ',>,.<.';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter({ input: 'AB' });
    const output = interpreter.run(program);
    expect(output).toBe('BA');
  });

  it('initializes memory to zero', () => {
    const interpreter = new Interpreter();
    const dump = interpreter.getMemoryDump(0, 10);
    expect(dump.every((v) => v === 0)).toBe(true);
  });

  it('wraps cell values on overflow (mod 256)', () => {
    // Set cell to 255 then add 1 -> should wrap to 0
    const source = '+'.repeat(256) + '.';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter();
    const output = interpreter.run(program);
    expect(output.charCodeAt(0)).toBe(0);
  });

  it('throws on pointer out of bounds', () => {
    // Try to move pointer left past 0
    const source = '<';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter({ memorySize: 10 });
    expect(() => interpreter.run(program)).toThrow('Pointer out of bounds');
  });

  it('throws on exceeding max step limit', () => {
    // Infinite loop: [+]  (increment never reaches zero from zero...
    // but let's use a setup that does loop: +[] loops forever
    const source = '+[]';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter({ maxSteps: 100 });
    expect(() => interpreter.run(program)).toThrow('maximum step limit');
  });

  it('returns execution stats', () => {
    const source = '+++>++>.';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter();
    interpreter.run(program);

    const stats = interpreter.getStats();
    expect(stats.steps).toBeGreaterThan(0);
    expect(stats.maxPointer).toBe(2);
    expect(stats.outputLength).toBe(1);
  });

  it('reset clears the interpreter state', () => {
    const source = '+++>';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter();
    interpreter.run(program);

    expect(interpreter.getPointer()).toBe(1);
    interpreter.reset();
    expect(interpreter.getPointer()).toBe(0);
    expect(interpreter.getMemoryDump(0, 5).every((v) => v === 0)).toBe(true);
  });

  it('handles EOF as 0 when no more input is available', () => {
    // Read beyond available input
    const source = ',.,.';
    const tokens = tokenize(source);
    const program = parse(tokens);
    const interpreter = new Interpreter({ input: 'A' });
    const output = interpreter.run(program);
    expect(output.charCodeAt(0)).toBe(65); // 'A'
    expect(output.charCodeAt(1)).toBe(0);  // EOF -> 0
  });
});
