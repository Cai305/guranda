import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';
import { sendWhatsAppMessage, verifyWhatsAppCredentials } from './adapters/whatsapp.adapter';

const NOT_CONNECTED =
  "The user hasn't connected a WhatsApp Business number yet — suggest they connect one under Profile > External Apps by pasting a system-user access token and phone number ID from Meta Business Manager.";

// WhatsApp Business Platform (Meta Cloud API) integration — a system-user
// access token + phone_number_id, not OAuth2 (see
// adapters/whatsapp.adapter.ts and IntegrationsService.connectWhatsApp).
// Scoped to what the Cloud API's free-form messaging actually allows: a
// business can only send free-form text to a user inside the 24-hour
// customer-service window (i.e. the user messaged the business number
// recently) — outside that window Meta requires a pre-approved message
// template this scaffolding doesn't implement, and sendMessage will fail
// with Meta's real rejection reason if that happens rather than silently
// pretending to succeed.
@Injectable()
export class WhatsappAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async credentials(userId: string): Promise<{ accessToken: string; phoneNumberId: string }> {
    const creds = await this.integrations.getWhatsAppCredentials(userId);
    if (!creds) throw new BadRequestException(NOT_CONNECTED);
    return creds;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('whatsapp', [
        {
          name: 'sendMessage',
          description:
            "Send a free-form text message through the user's connected WhatsApp Business number to a specific recipient phone number (requires the user to have connected WhatsApp in Guranda settings, and the recipient to be inside Meta's 24-hour customer-service messaging window). Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: "Recipient's phone number in international format, e.g. 27821234567 (no +)" },
              text: { type: 'string' },
            },
            required: ['to', 'text'],
          },
          permissionKey: 'whatsapp.sendMessage',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Send a WhatsApp message to ${input.to}: "${input.text}"`,
          handler: async (ctx, input) => {
            const { accessToken, phoneNumberId } = await this.credentials(ctx.userId);
            const result = await sendWhatsAppMessage(accessToken, phoneNumberId, input.to, input.text);
            return { sent: true, messageId: result.messageId };
          },
          describeResult: (input) => `Sent a WhatsApp message to ${input.to}.`,
        },
        {
          name: 'getPhoneStatus',
          description:
            "Check the live status of the user's connected WhatsApp Business phone number (real call to Meta's phone-number-metadata endpoint) — useful to confirm the connection is genuinely working.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'whatsapp.read',
          sensitive: false,
          defaultGranted: true,
          handler: async (ctx) => {
            const { accessToken, phoneNumberId } = await this.credentials(ctx.userId);
            return verifyWhatsAppCredentials(accessToken, phoneNumberId);
          },
          describeResult: (_i, output: any) => `WhatsApp number ${output.displayPhoneNumber} (${output.verifiedName}).`,
        },
      ]),
    );
  }
}
