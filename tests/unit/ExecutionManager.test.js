import { describe, it, expect } from 'vitest';
import { ExecutionManager } from '../../src/scripts/editor/ExecutionManager.js';

describe('ExecutionManager — simulated languages', () => {
  it('returns a simulated result for C++ without touching a worker', async () => {
    const manager = new ExecutionManager();
    const result = await manager.run('cpp', 'int main() { return 0; }');
    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.output).toContain('C++');
    manager.destroy();
  });

  it('returns a simulated result for Rust', async () => {
    const manager = new ExecutionManager();
    const result = await manager.run('rust', 'fn main() {}');
    expect(result.simulated).toBe(true);
    expect(result.output).toContain('Rust');
    manager.destroy();
  });

  it('returns a simulated result for Go', async () => {
    const manager = new ExecutionManager();
    const result = await manager.run('go', 'func main() {}');
    expect(result.simulated).toBe(true);
    expect(result.output).toContain('Go');
    manager.destroy();
  });

  it('rejects empty code for simulated languages with a clear message, not a fake success', async () => {
    const manager = new ExecutionManager();
    const result = await manager.run('cpp', '   ');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    manager.destroy();
  });

  it('never claims a simulated run compiled or actually executed', async () => {
    const manager = new ExecutionManager();
    const result = await manager.run('rust', 'fn main() { println!("hi"); }');
    expect(result.output.toLowerCase()).toContain("doesn't compile live");
    manager.destroy();
  });
});
