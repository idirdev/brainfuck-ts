#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { tokenize } from './lexer';
import { parse } from './parser';
import { Interpreter } from './interpreter';
import { Debugger } from './debugger';
import { optimize } from './optimizer';
import { compile } from './compiler';
import { startRepl } from './repl';

const program = new Command();

program
  .name('brainfuck')
  .description('Brainfuck interpreter and compiler written in TypeScript')
  .version('1.0.0');

program
  .command('run <file>')
  .description('Run a brainfuck program')
  .option('-i, --input <string>', 'Input string for the program', '')
  .option('-d, --debug', 'Enable debug mode with step-by-step execution', false)
  .option('-o, --optimize', 'Enable optimization passes', false)
  .option('-c, --compile [output]', 'Compile to JavaScript instead of interpreting')
  .option('-m, --memory <size>', 'Memory size in cells', '30000')
  .option('-s, --max-steps <steps>', 'Maximum execution steps', '10000000')
  .option('--stats', 'Show execution statistics after running', false)
  .action((file: string, opts) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Error: File not found: ${filePath}`));
      process.exit(1);
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const tokens = tokenize(source);

    try {
      let parsed = parse(tokens);

      if (opts.optimize) {
        parsed = optimize(parsed);
        if (opts.debug) {
          console.log(chalk.gray(`Optimized: ${parsed.length} top-level instructions`));
        }
      }

      // Compile mode
      if (opts.compile !== undefined) {
        const jsSource = compile(parsed);
        const outputPath =
          typeof opts.compile === 'string'
            ? opts.compile
            : filePath.replace(/\.bf$/, '.js');
        fs.writeFileSync(outputPath, jsSource, 'utf-8');
        console.log(chalk.green(`Compiled to: ${outputPath}`));
        return;
      }

      // Debug mode
      if (opts.debug) {
        const dbg = new Debugger({
          memorySize: parseInt(opts.memory, 10),
          maxSteps: parseInt(opts.maxSteps, 10),
          input: opts.input,
        });
        const output = dbg.run(parsed);
        process.stdout.write(output);
        dbg.printState();
        dbg.printHistory(20);
        return;
      }

      // Normal execution
      const interpreter = new Interpreter({
        memorySize: parseInt(opts.memory, 10),
        maxSteps: parseInt(opts.maxSteps, 10),
        input: opts.input,
      });

      const output = interpreter.run(parsed);
      process.stdout.write(output);

      if (opts.stats) {
        const stats = interpreter.getStats();
        console.log(chalk.gray(`\n--- Stats ---`));
        console.log(chalk.gray(`Steps:        ${stats.steps}`));
        console.log(chalk.gray(`Max pointer:  ${stats.maxPointer}`));
        console.log(chalk.gray(`Output chars: ${stats.outputLength}`));
        console.log(chalk.gray(`Cells used:   ${stats.cellsUsed}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('repl')
  .description('Start an interactive brainfuck REPL')
  .option('-m, --memory <size>', 'Memory size in cells', '30000')
  .action((opts) => {
    startRepl({
      memorySize: parseInt(opts.memory, 10),
    });
  });

program.parse(process.argv);
