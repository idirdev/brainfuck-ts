> **Archived** — Kept for reference. Not part of the current portfolio.

# brainfuck-ts

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-featured Brainfuck interpreter, optimizer, and compiler written in TypeScript. Built as a fun weekend project in 2019.

## What is Brainfuck?

Brainfuck is an esoteric programming language created by Urban Muller in 1993. It operates on an array of 30,000 memory cells, each initially set to zero, with a movable data pointer. The entire language consists of only 8 commands:

| Command | Description |
|---------|-------------|
| `+` | Increment the byte at the data pointer |
| `-` | Decrement the byte at the data pointer |
| `>` | Move the data pointer to the right |
| `<` | Move the data pointer to the left |
| `.` | Output the byte at the data pointer as an ASCII character |
| `,` | Read one byte of input into the data pointer |
| `[` | Jump forward past matching `]` if byte at pointer is zero |
| `]` | Jump back to matching `[` if byte at pointer is nonzero |

Everything else is treated as a comment.

## Features

- **Interpreter** - Execute brainfuck programs with configurable memory and step limits
- **Optimizer** - Multiple optimization passes: collapse repeated ops, detect clear/scan/copy/multiply loops
- **Compiler** - Compile brainfuck to standalone JavaScript files
- **Debugger** - Step-by-step execution, breakpoints, memory inspection, execution history
- **REPL** - Interactive mode with live execution and memory state inspection

## Installation

```bash
npm install
npm run build
```

## Usage

### Run a program

```bash
node dist/index.js run examples/hello.bf
```

### Run with input

```bash
node dist/index.js run examples/rot13.bf --input "Hello World"
```

### Run with optimizations

```bash
node dist/index.js run examples/hello.bf --optimize --stats
```

### Compile to JavaScript

```bash
node dist/index.js run examples/hello.bf --compile output.js
node output.js
```

### Debug mode

```bash
node dist/index.js run examples/hello.bf --debug
```

### Interactive REPL

```bash
node dist/index.js repl
```

In the REPL, type brainfuck code and press Enter. Use these commands:

- `:help` - Show command reference
- `:dump` - Display memory state
- `:stats` - Show execution statistics
- `:reset` - Reset the interpreter
- `:quit` - Exit

## Optimization Examples

The optimizer performs several passes to speed up execution:

```
Before: ++++++        After: ADD 6        (collapse repeated ops)
Before: [-]           After: CLEAR        (clear loop detection)
Before: [>]           After: SCAN_RIGHT   (scan loop detection)
Before: [->+<]        After: COPY +1      (copy loop detection)
Before: [->+++<]      After: MULTIPLY *3  (multiply loop detection)
```

## Project Structure

```
brainfuck-ts/
  src/
    index.ts        CLI entry point (commander)
    types.ts        Token enum, Instruction, Config interfaces
    lexer.ts        Tokenizer with source position tracking
    parser.ts       Recursive descent parser with bracket matching
    interpreter.ts  Core execution engine (Uint8Array memory)
    optimizer.ts    Peephole optimization passes
    compiler.ts     BF-to-JavaScript compiler
    debugger.ts     Step debugger with breakpoints and history
    repl.ts         Interactive REPL with :commands
  examples/
    hello.bf        Hello World
    fibonacci.bf    Fibonacci sequence
    rot13.bf        ROT13 cipher
```

## License

MIT
