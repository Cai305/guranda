import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { WalletsService } from './wallets.service';

@Injectable()
export class WalletAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private wallets: WalletsService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('wallet', [
        {
          name: 'read',
          description:
            "Read the user's Masheleni (MSH) wallet balance and recent transactions.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'wallet.read',
          legacyAliases: ['walletRead'],
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.wallets.getMyWallet(ctx.userId),
          describeResult: (_i, output) => {
            const tx = (output.transactions || [])
              .slice(0, 5)
              .map((t: any) => `${t.type} ${t.amount} MSH`)
              .join('; ');
            return `Balance: ${output.balanceMasheleni} MSH. Recent transactions: ${tx || 'none'}.`;
          },
        },
        {
          name: 'send',
          description:
            "Send Masheleni (MSH) from the user's wallet to another user by username or wallet address. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              destination: {
                type: 'string',
                description: 'Recipient username or wallet address',
              },
              amount: { type: 'string', description: 'Amount of MSH to send' },
            },
            required: ['destination', 'amount'],
          },
          permissionKey: 'wallet.send',
          legacyAliases: ['walletSend'],
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.wallets.sendMasheleni(
              ctx.userId,
              input.destination,
              input.amount,
            ),
          describeAction: (input) =>
            `Send ${input.amount} MSH to ${input.destination}`,
          describeResult: (input) =>
            `Sent ${input.amount} MSH to ${input.destination}.`,
        },
      ]),
    );
  }
}
