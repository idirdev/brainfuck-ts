import { Token, OptimizedOp, Instruction, Program } from './types';

/**
 * Detect clear loop pattern: [-] or [+]
 * Sets current cell to zero in a single operation.
 */
function isClearLoop(instr: Instruction): boolean {
  if (instr.op !== Token.Open || !instr.innerOps) return false;
  const ops = instr.innerOps;
  return (
    ops.length === 1 &&
    ops[0].op === Token.Plus &&
    (ops[0].count === -1 || ops[0].count === 1)
  );
}

/**
 * Detect scan loop pattern: [>] or [<]
 * Moves pointer until a zero cell is found.
 */
function isScanLoop(instr: Instruction): 'right' | 'left' | null {
  if (instr.op !== Token.Open || !instr.innerOps) return null;
  const ops = instr.innerOps;
  if (ops.length === 1 && ops[0].op === Token.Right) {
    if (ops[0].count === 1) return 'right';
    if (ops[0].count === -1) return 'left';
  }
  return null;
}

/**
 * Detect copy/multiply loop pattern: [->+<] or [->>+++<<]
 * Copies or multiplies current cell value to another cell.
 */
function isCopyOrMultiplyLoop(
  instr: Instruction
): { offset: number; multiplier: number } | null {
  if (instr.op !== Token.Open || !instr.innerOps) return null;
  const ops = instr.innerOps;

  // Pattern: decrement, move right, add N, move back
  // [->>>+++<<<] => multiply by 3 at offset +3
  if (ops.length === 3) {
    const [dec, moveRight, add] = ops;
    // Check: first op decrements by 1
    if (dec.op !== Token.Plus || dec.count !== -1) return null;
    // Check: second op is a move right (positive count)
    if (moveRight.op !== Token.Right) return null;
    // Third must be an add
    if (add.op !== Token.Plus) return null;

    // We need a matching move back — but with 3 ops there's no move back
    // So actually the pattern needs 4 ops: dec, move, add, move-back
    return null;
  }

  if (ops.length === 4) {
    const [dec, moveRight, add, moveBack] = ops;
    if (dec.op !== Token.Plus || dec.count !== -1) return null;
    if (moveRight.op !== Token.Right) return null;
    if (add.op !== Token.Plus || add.count < 1) return null;
    if (moveBack.op !== Token.Right) return null;

    // moveRight + moveBack should sum to zero (return to original position)
    if (moveRight.count + moveBack.count !== 0) return null;

    return { offset: moveRight.count, multiplier: add.count };
  }

  return null;
}

/**
 * Run optimization passes on a parsed program.
 */
export function optimize(program: Program): Program {
  return peepholePass(program);
}

function peepholePass(instructions: Program): Program {
  const result: Program = [];

  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];

    // Detect clear loops: [-] or [+]
    if (isClearLoop(instr)) {
      result.push({ op: OptimizedOp.Clear, count: 1, sourcePos: instr.sourcePos });
      continue;
    }

    // Detect scan loops: [>] or [<]
    const scanDir = isScanLoop(instr);
    if (scanDir === 'right') {
      result.push({ op: OptimizedOp.ScanRight, count: 1, sourcePos: instr.sourcePos });
      continue;
    }
    if (scanDir === 'left') {
      result.push({ op: OptimizedOp.ScanLeft, count: 1, sourcePos: instr.sourcePos });
      continue;
    }

    // Detect copy/multiply loops: [->+<] [->+++<]
    const copyInfo = isCopyOrMultiplyLoop(instr);
    if (copyInfo) {
      const op =
        copyInfo.multiplier === 1 ? OptimizedOp.Copy : OptimizedOp.Multiply;
      result.push({
        op,
        count: 1,
        offset: copyInfo.offset,
        multiplier: copyInfo.multiplier,
        sourcePos: instr.sourcePos,
      });
      continue;
    }

    // Recursively optimize inner loops
    if (instr.op === Token.Open && instr.innerOps) {
      result.push({
        ...instr,
        innerOps: peepholePass(instr.innerOps),
      });
      continue;
    }

    // Remove dead code: operations right after a Clear that don't depend on cell value
    // Skip adding to an already-cleared cell if the next op adds to it
    // (this is handled by the consecutive-op collapsing in the parser)

    result.push(instr);
  }

  // Second pass: remove no-ops (count === 0) that might have been produced
  return result.filter((instr) => {
    if ((instr.op === Token.Plus || instr.op === Token.Right) && instr.count === 0) {
      return false;
    }
    return true;
  });
}
