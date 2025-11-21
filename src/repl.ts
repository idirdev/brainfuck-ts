import * as readline from 'readline';
import chalk from 'chalk';
import { tokenize } from './lexer';
import { parse } from './parser';
import { Interpreter } from './interpreter';
import { Config } from './types';

export function startRepl(config: Partial<Config> = {}): void {
  const interpreter = new Interpreter({ ...config, maxSteps: 1_000_000 });
  let accumulator = '';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('bf> '),
  });

  console.log(chalk.bold('\nBrainfuck REPL'));
  console.log(chalk.gray('Type brainfuck code to execute. Commands:'));
  console.log(chalk.gray('  :help   - Show help'));
  console.log(chalk.gray('  :dump   - Dump memory state'));
  console.log(chalk.gray('  :reset  - Reset interpreter'));
  console.log(chalk.gray('  :stats  - Show execution stats'));
  console.log(chalk.gray('  :quit   - Exit REPL'));
  console.log('');

  rl.prompt();

  rl.on('line', (line: string) => {
    const trimmed = line.trim();

    // Handle commands
    if (trimmed === ':help') {
      console.log(chalk.bold('\nBrainfuck Commands:'));
      console.log('  +  Increment current cell');
      console.log('  -  Decrement current cell');
      console.log('  >  Move pointer right');
      console.log('  <  Move pointer left');
      console.log('  .  Output current cell as ASCII');
      console.log('  ,  Read input into current cell');
      console.log('  [  Begin loop (skip if cell is 0)');
      console.log('  ]  End loop (jump back if cell is not 0)');
      console.log('');
      rl.prompt();
      return;
    }

    if (trimmed === ':dump') {
      const dump = interpreter.getMemoryDump(0, 30);
      const ptr = interpreter.getPointer();
      console.log(chalk.bold('\nMemory dump (cells 0-29):'));
      const cells = dump.map((v, i) => {
        const val = v.toString().padStart(3, ' ');
        return i === ptr ? chalk.bgWhite.black(`[${val}]`) : ` ${val} `;
      });
      console.log(cells.join(''));
      console.log(chalk.gray(`Pointer at cell ${ptr}\n`));
      rl.prompt();
      return;
    }

    if (trimmed === ':reset') {
      interpreter.reset();
      accumulator = '';
      console.log(chalk.green('Interpreter reset.\n'));
      rl.prompt();
      return;
    }

    if (trimmed === ':stats') {
      const stats = interpreter.getStats();
      console.log(chalk.bold('\nExecution stats:'));
      console.log(`  Steps executed: ${stats.steps}`);
      console.log(`  Max pointer:    ${stats.maxPointer}`);
      console.log(`  Output length:  ${stats.outputLength}`);
      console.log(`  Cells used:     ${stats.cellsUsed}`);
      console.log('');
      rl.prompt();
      return;
    }

    if (trimmed === ':quit' || trimmed === ':exit' || trimmed === ':q') {
      console.log(chalk.gray('Goodbye.'));
      rl.close();
      process.exit(0);
    }

    // Accumulate brainfuck code
    accumulator += line;

    // Check if brackets are matched
    let openCount = 0;
    for (const ch of accumulator) {
      if (ch === '[') openCount++;
      if (ch === ']') openCount--;
    }

    if (openCount > 0) {
      // Unmatched brackets - wait for more input
      rl.setPrompt(chalk.yellow('... '));
      rl.prompt();
      return;
    }

    if (openCount < 0) {
      console.log(chalk.red('Error: unmatched closing bracket'));
      accumulator = '';
      rl.setPrompt(chalk.cyan('bf> '));
      rl.prompt();
      return;
    }

    // Brackets matched - execute
    try {
      const tokens = tokenize(accumulator);
      if (tokens.length > 0) {
        const program = parse(tokens);
        const output = interpreter.run(program);
        if (output.length > 0) {
          console.log(chalk.green('=> ') + output);
        }
      }
    } catch (err: any) {
      console.log(chalk.red(`Error: ${err.message}`));
    }

    accumulator = '';
    rl.setPrompt(chalk.cyan('bf> '));
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye.'));
    process.exit(0);
  });
}
