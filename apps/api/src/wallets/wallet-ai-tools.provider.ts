import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { WalletsService } from './wallets.service';
import { FinancialEngineService } from './financial-engine.service';

@Injectable()
export class WalletAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private wallets: WalletsService,
    private financialEngine: FinancialEngineService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('wallet', [
        {
          name: 'read',
          description:
            "Read the user's Rand (R) wallet balance and recent transactions.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'wallet.read',
          legacyAliases: ['walletRead'],
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.wallets.getMyWallet(ctx.userId),
          describeResult: (_i, output) => {
            const tx = (output.transactions || [])
              .slice(0, 5)
              .map((t: any) => `${t.type} R${t.amount}`)
              .join('; ');
            return `Balance: R${output.balanceMasheleni}. Recent transactions: ${tx || 'none'}.`;
          },
        },
        {
          name: 'send',
          description:
            "Send Rand (R) from the user's wallet to another user by username or wallet address. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              destination: {
                type: 'string',
                description: 'Recipient username or wallet address',
              },
              amount: { type: 'string', description: 'Amount of Rand to send' },
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
            `Send R${input.amount} to ${input.destination}`,
          describeResult: (input) =>
            `Sent R${input.amount} to ${input.destination}.`,
        },
        {
          name: 'requestPayment',
          description:
            'Ask another Guranda user to pay the user some Rand (R), by username. Sends them a notification; nothing is transferred unless they accept. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              destination: {
                type: 'string',
                description: 'Username of the person to request Rand from',
              },
              amount: { type: 'string', description: 'Amount of Rand to request' },
              memo: { type: 'string', description: 'Optional note explaining what the request is for' },
            },
            required: ['destination', 'amount'],
          },
          permissionKey: 'wallet.requestPayment',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.financialEngine.requestPayment(
              ctx.userId,
              input.destination,
              input.amount,
              input.memo,
            ),
          describeAction: (input) =>
            `Request R${input.amount} from ${input.destination}`,
          describeResult: (input) =>
            `Requested R${input.amount} from ${input.destination}.`,
        },
      ]),
    );
  }
}
