import chalk from 'chalk';
import { Instruction, Program, Config } from './types';
import { Interpreter } from './interpreter';

interface HistoryEntry {
  step: number;
  op: string;
  pointer: number;
  cellValue: number;
  output: string;
}

export class Debugger extends Interpreter {
  private breakpoints: Set<number>;
  private stepMode: boolean;
  private history: HistoryEntry[];
  private paused: boolean;
  private currentInstr: Instruction | null;

  constructor(config: Partial<Config> = {}) {
    super({ ...config, debug: true });
    this.breakpoints = new Set();
    this.stepMode = false;
    this.history = [];
    this.paused = false;
    this.currentInstr = null;
  }

  addBreakpoint(position: number): void {
    this.breakpoints.add(position);
    console.log(chalk.yellow(`Breakpoint set at position ${position}`));
  }

  removeBreakpoint(position: number): void {
    this.breakpoints.delete(position);
    console.log(chalk.yellow(`Breakpoint removed at position ${position}`));
  }

  listBreakpoints(): number[] {
    return Array.from(this.breakpoints).sort((a, b) => a - b);
  }

  enableStepMode(): void {
    this.stepMode = true;
    console.log(chalk.cyan('Step mode enabled'));
  }

  disableStepMode(): void {
    this.stepMode = false;
    console.log(chalk.cyan('Step mode disabled'));
  }

  protected executeInstruction(instr: Instruction): void {
    this.currentInstr = instr;

    // Record history before execution
    this.history.push({
      step: this.steps,
      op: String(instr.op),
      pointer: this.pointer,
      cellValue: this.memory[this.pointer],
      output: this.output,
    });

    // Keep history bounded
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }

    // Check breakpoint
    if (instr.sourcePos !== undefined && this.breakpoints.has(instr.sourcePos)) {
      console.log(chalk.red(`\nBreakpoint hit at position ${instr.sourcePos}`));
      this.printState();
    }

    super.executeInstruction(instr);
  }

  step(program: Program): void {
    this.stepMode = true;
    if (program.length > 0) {
      this.executeInstruction(program[0]);
      this.printState();
    }
  }

  printState(): void {
    const ptr = this.pointer;
    console.log(chalk.bold('\n--- Debugger State ---'));
    console.log(chalk.green(`Step:    ${this.steps}`));
    console.log(chalk.green(`Pointer: ${ptr}`));
    console.log(chalk.green(`Cell:    ${this.memory[ptr]} (0x${this.memory[ptr].toString(16).padStart(2, '0')}, '${this.memory[ptr] >= 32 && this.memory[ptr] < 127 ? String.fromCharCode(this.memory[ptr]) : '.'}')`));
    console.log(chalk.green(`Output:  "${this.output}"`));
    this.printMemoryDump(Math.max(0, ptr - 5), Math.min(this.config.memorySize, ptr + 6));
    console.log(chalk.bold('---------------------\n'));
  }

  printMemoryDump(start: number, end: number): void {
    const cells: string[] = [];
    for (let i = start; i < end; i++) {
      const val = this.memory[i].toString().padStart(3, ' ');
      if (i === this.pointer) {
        cells.push(chalk.bgWhite.black(`[${val}]`));
      } else {
        cells.push(` ${val} `);
      }
    }
    console.log(chalk.cyan('Memory: ') + cells.join(''));

    // Print pointer indicator
    const indices: string[] = [];
    for (let i = start; i < end; i++) {
      const idx = i.toString().padStart(3, ' ');
      if (i === this.pointer) {
        indices.push(chalk.yellow(` ${idx} `));
      } else {
        indices.push(` ${idx} `);
      }
    }
    console.log(chalk.cyan('Index:  ') + indices.join(''));
  }

  getHistory(count: number = 10): HistoryEntry[] {
    return this.history.slice(-count);
  }

  printHistory(count: number = 10): void {
    const entries = this.getHistory(count);
    console.log(chalk.bold(`\nLast ${entries.length} steps:`));
    for (const entry of entries) {
      console.log(
        chalk.gray(`  #${entry.step}`) +
        ` op=${chalk.yellow(entry.op)}` +
        ` ptr=${chalk.cyan(String(entry.pointer))}` +
        ` val=${chalk.green(String(entry.cellValue))}`
      );
    }
  }
}
