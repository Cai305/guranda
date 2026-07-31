import {
  LlmAdapter,
  RuntimeMessage,
  RuntimeTool,
  RuntimeTurnResult,
} from '../llm-adapter.interface';

/**
 * A scripted LlmAdapter for tests — lets the whole Agent Runtime (tool
 * resolution, permission filtering, pendingAction generation, MAX_LOOPS,
 * session touch) be exercised deterministically without spending real LLM
 * credits or depending on network access.
 *
 * Usage: new FakeLlmAdapter([turn1, turn2, ...]) — each call to runTurn()
 * returns the next scripted RuntimeTurnResult, in order.
 */
export class FakeLlmAdapter implements LlmAdapter {
  private calls: Array<{
    system: string;
    messages: RuntimeMessage[];
    tools: RuntimeTool[];
  }> = [];

  constructor(private script: RuntimeTurnResult[]) {}

  get callHistory() {
    return this.calls;
  }

  async runTurn(params: {
    system: string;
    messages: RuntimeMessage[];
    tools: RuntimeTool[];
  }): Promise<RuntimeTurnResult> {
    this.calls.push(params);
    const turn = this.script[this.calls.length - 1];
    if (!turn) {
      return {
        content: 'Fake adapter ran out of scripted turns.',
        toolCalls: [],
        stopReason: 'end_turn',
      };
    }
    return turn;
  }
}
