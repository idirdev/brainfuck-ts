export enum Token {
  Plus = '+',
  Minus = '-',
  Right = '>',
  Left = '<',
  Open = '[',
  Close = ']',
  Read = ',',
  Write = '.',
}

export enum OptimizedOp {
  Add = 'ADD',
  Move = 'MOVE',
  Read = 'READ',
  Write = 'WRITE',
  Loop = 'LOOP',
  Clear = 'CLEAR',
  ScanRight = 'SCAN_RIGHT',
  ScanLeft = 'SCAN_LEFT',
  Copy = 'COPY',
  Multiply = 'MULTIPLY',
}

export interface Instruction {
  op: Token | OptimizedOp;
  count: number;
  innerOps?: Instruction[];
  offset?: number;
  multiplier?: number;
  sourcePos?: number;
}

export type Program = Instruction[];

export interface Config {
  memorySize: number;
  maxSteps: number;
  input: string;
  debug: boolean;
  optimize: boolean;
}

export interface ExecutionStats {
  steps: number;
  maxPointer: number;
  outputLength: number;
  cellsUsed: number;
}
