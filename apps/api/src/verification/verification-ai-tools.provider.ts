import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { VerificationService } from './verification.service';

// Only status is exposed — verification.submit() requires an already-
// uploaded idDocumentUrl, so it can't be meaningfully driven from a chat
// turn (same media-dependency exclusion as video/story creation).
@Injectable()
export class VerificationAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private verification: VerificationService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('verification', [
        {
          name: 'status',
          description:
            "Check the user's account verification status (UNVERIFIED, PENDING, VERIFIED, REJECTED).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'verification.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.verification.me(ctx.userId),
          describeResult: (_i, output: any) =>
            `Status: ${output?.status ?? 'UNVERIFIED'}.`,
        },
      ]),
    );
  }
}
