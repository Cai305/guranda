import { CardsAiToolsProvider } from './cards-ai-tools.provider';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';

function makeCardsMock() {
  return {
    startAIGame: jest.fn(async () => ({ id: 'game-1' })),
    fiveCardsDiscard: jest.fn(async () => ({ game: { id: 'game-1' } })),
    cassinoPlay: jest.fn(async () => ({ game: { id: 'game-1' } })),
  };
}

describe('CardsAiToolsProvider', () => {
  let registry: ToolRegistryService;
  let cards: ReturnType<typeof makeCardsMock>;

  beforeEach(() => {
    registry = new ToolRegistryService();
    cards = makeCardsMock();
    new CardsAiToolsProvider(registry, cards as any).onModuleInit();
  });

  it('registers all four cards tools, namespaced under "cards."', () => {
    const names = registry.listTools({ module: 'cards' }).map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['cards.startFiveCardsVsAI', 'cards.startCassinoVsAI', 'cards.fiveCardsDiscard', 'cards.cassinoPlay']),
    );
  });

  it('exposes starting a game as non-sensitive and auto-granted', () => {
    const tool = registry.getTool('cards.startFiveCardsVsAI');
    expect(tool.sensitive).toBe(false);
    expect(tool.defaultGranted).toBe(true);
  });

  it('gates actual game moves as sensitive, requiring approval', () => {
    expect(registry.getTool('cards.fiveCardsDiscard').sensitive).toBe(true);
    expect(registry.getTool('cards.cassinoPlay').sensitive).toBe(true);
  });

  it('startFiveCardsVsAI handler calls into CardsService.startAIGame with the requesting user id', async () => {
    const tool = registry.getTool('cards.startFiveCardsVsAI');
    await tool.handler({ userId: 'u1' }, { difficulty: 'hard', jokersEnabled: true });
    expect(cards.startAIGame).toHaveBeenCalledWith('FIVE_CARDS', 'u1', 'You', 'hard', { jokersEnabled: true });
  });

  it('fiveCardsDiscard handler forwards gameId, userId and the card', async () => {
    const tool = registry.getTool('cards.fiveCardsDiscard');
    await tool.handler({ userId: 'u1' }, { gameId: 'game-1', suit: 'S', rank: 5 });
    expect(cards.fiveCardsDiscard).toHaveBeenCalledWith('game-1', 'u1', { suit: 'S', rank: 5 });
  });

  it('cassinoPlay handler forwards the full action payload', async () => {
    const tool = registry.getTool('cards.cassinoPlay');
    await tool.handler({ userId: 'u1' }, { gameId: 'game-1', action: 'capture', suit: 'H', rank: 7, targetIds: ['H3', 'D4'] });
    expect(cards.cassinoPlay).toHaveBeenCalledWith('game-1', 'u1', 'capture', { suit: 'H', rank: 7 }, ['H3', 'D4'], undefined);
  });
});
