// All random draws used by the engine go through this local synchronous scope.
// Never replace global Math.random: independent matches can be stepped in any order.
let activeState = null;

export function createRandomState(seed) {
  const actualSeed = seed ?? `${Date.now()}-${Math.random()}`;
  const text = String(actualSeed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return { version: 1, seed: text, state: hash >>> 0, draws: 0 };
}

export function random() {
  if (!activeState) return Math.random();
  // Mulberry32, serialized as uint32 rather than a closure or floating accumulator.
  activeState.state = (activeState.state + 0x6d2b79f5) >>> 0;
  let value = activeState.state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  activeState.draws += 1;
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function withRandomState(state, callback) {
  const previous = activeState;
  activeState = state;
  try {
    return callback();
  } finally {
    activeState = previous;
  }
}

export function hasRandomState() {
  return activeState !== null;
}
