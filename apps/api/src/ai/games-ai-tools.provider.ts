import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';

// Static content — there is no unified games-catalog service (Chess/Ludo/
// Murabaraba/WordBattle/Pool are separate modules with no shared registry
// today), so this is documented as content, not live availability data.
const GAMES_CATALOG = `Chess — real-time multiplayer chess (Games > Chess).
Trivia Arcade — fast quiz rounds against the clock (Games > Trivia).
Ludo — classic board race, 1v1 to 4v4, vs AI or online (Games > Ludo).
Murabaraba — South Africa's game of cows: place 12 cows, make mills, shoot the enemy herd; vs AI (easy/medium/hard) or 2 players (Games > Murabaraba).`;

@Injectable()
export class GamesAiToolsProvider implements OnModuleInit {
  constructor(private registry: ToolRegistryService) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('games', [
        {
          name: 'list',
          description:
            'List the games available with a one-line description of each, so you can help the user pick and explain how to start one.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'games.play',
          legacyAliases: ['gamesPlay'],
          sensitive: false,
          defaultGranted: true,
          handler: async () => GAMES_CATALOG,
          describeResult: (_i, output) => output,
        },
      ]),
    );
  }
}
