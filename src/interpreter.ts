import { Token, OptimizedOp, Instruction, Program, Config, ExecutionStats } from './types';

export class Interpreter {
  protected memory: Uint8Array;
  protected pointer: number;
  protected steps: number;
  protected maxPointer: number;
  protected inputBuffer: number[];
  protected inputIndex: number;
  protected output: string;
  protected config: Config;

  constructor(config: Partial<Config> = {}) {
    this.config = {
      memorySize: config.memorySize ?? 30000,
      maxSteps: config.maxSteps ?? 10_000_000,
      input: config.input ?? '',
      debug: config.debug ?? false,
      optimize: config.optimize ?? false,
    };

    this.memory = new Uint8Array(this.config.memorySize);
    this.pointer = 0;
    this.steps = 0;
    this.maxPointer = 0;
    this.inputBuffer = Array.from(this.config.input).map((c) => c.charCodeAt(0));
    this.inputIndex = 0;
    this.output = '';
  }

  run(program: Program): string {
    this.output = '';
    this.steps = 0;
    this.executeBlock(program);
    return this.output;
  }

  protected executeBlock(instructions: Instruction[]): void {
    for (const instr of instructions) {
      this.executeInstruction(instr);
    }
  }

  protected executeInstruction(instr: Instruction): void {
    this.steps++;
    if (this.steps > this.config.maxSteps) {
      throw new Error(
        `Execution exceeded maximum step limit of ${this.config.maxSteps}. Possible infinite loop.`
      );
    }

    switch (instr.op) {
      case Token.Plus:
        // count can be negative (for minus operations collapsed)
        this.memory[this.pointer] = (this.memory[this.pointer] + instr.count) & 0xff;
        break;

      case Token.Right:
        this.pointer += instr.count;
        if (this.pointer < 0 || this.pointer >= this.config.memorySize) {
          throw new Error(
            `Pointer out of bounds: ${this.pointer} (memory size: ${this.config.memorySize})`
          );
        }
        if (this.pointer > this.maxPointer) {
          this.maxPointer = this.pointer;
        }
        break;

      case Token.Read:
        if (this.inputIndex < this.inputBuffer.length) {
          this.memory[this.pointer] = this.inputBuffer[this.inputIndex++];
        } else {
          this.memory[this.pointer] = 0; // EOF returns 0
        }
        break;

      case Token.Write:
        this.output += String.fromCharCode(this.memory[this.pointer]);
        break;

      case Token.Open:
        while (this.memory[this.pointer] !== 0) {
          this.executeBlock(instr.innerOps!);
          this.steps++;
          if (this.steps > this.config.maxSteps) {
            throw new Error(
              `Execution exceeded maximum step limit of ${this.config.maxSteps}. Possible infinite loop.`
            );
          }
        }
        break;

      case OptimizedOp.Clear:
        this.memory[this.pointer] = 0;
        break;

      case OptimizedOp.ScanRight:
        while (this.memory[this.pointer] !== 0) {
          this.pointer++;
          if (this.pointer >= this.config.memorySize) {
            throw new Error('ScanRight went out of bounds');
          }
        }
        if (this.pointer > this.maxPointer) this.maxPointer = this.pointer;
        break;

      case OptimizedOp.ScanLeft:
        while (this.memory[this.pointer] !== 0) {
          this.pointer--;
          if (this.pointer < 0) {
            throw new Error('ScanLeft went out of bounds');
          }
        }
        break;

      case OptimizedOp.Copy:
        if (this.memory[this.pointer] !== 0) {
          const offset = instr.offset ?? 1;
          const target = this.pointer + offset;
          if (target < 0 || target >= this.config.memorySize) {
            throw new Error('Copy target out of bounds');
          }
          this.memory[target] = (this.memory[target] + this.memory[this.pointer]) & 0xff;
          this.memory[this.pointer] = 0;
          if (target > this.maxPointer) this.maxPointer = target;
        }
        break;

      case OptimizedOp.Multiply:
        if (this.memory[this.pointer] !== 0) {
          const offset = instr.offset ?? 1;
          const multiplier = instr.multiplier ?? 1;
          const target = this.pointer + offset;
          if (target < 0 || target >= this.config.memorySize) {
            throw new Error('Multiply target out of bounds');
          }
          this.memory[target] =
            (this.memory[target] + this.memory[this.pointer] * multiplier) & 0xff;
          this.memory[this.pointer] = 0;
          if (target > this.maxPointer) this.maxPointer = target;
        }
        break;

      default:
        throw new Error(`Unknown instruction: ${instr.op}`);
    }
  }

  getMemoryDump(start: number = 0, length: number = 20): number[] {
    return Array.from(this.memory.slice(start, start + length));
  }

  getPointer(): number {
    return this.pointer;
  }

  getStats(): ExecutionStats {
    let cellsUsed = 0;
    for (let i = 0; i <= this.maxPointer; i++) {
      if (this.memory[i] !== 0) cellsUsed++;
    }
    return {
      steps: this.steps,
      maxPointer: this.maxPointer,
      outputLength: this.output.length,
      cellsUsed,
    };
  }

  reset(): void {
    this.memory.fill(0);
    this.pointer = 0;
    this.steps = 0;
    this.maxPointer = 0;
    this.inputIndex = 0;
    this.output = '';
  }
}
