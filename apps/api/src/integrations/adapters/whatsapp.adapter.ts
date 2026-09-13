import { BadRequestException } from '@nestjs/common';

// WhatsApp Business Platform (Meta Cloud API) is NOT an OAuth2 redirect
// flow for this use case — there's no authorize redirect, no app-level
// client id/secret, no user consent screen. A business owner creates a
// WhatsApp Business app + phone number directly in Meta Business Manager
// (business.facebook.com), which hands back a permanent system-user access
// token and a phone_number_id. The user pastes BOTH of those into Guranda
// directly (see IntegrationsService.connectWhatsApp / ConnectedAppsScreen's
// WhatsApp card); this file hits the Cloud API's real phone-number-metadata
// endpoint to prove the token+phoneNumberId pair actually works BEFORE it's
// ever saved as "connected" — a bad/fake pair must fail loudly here, not
// save silently. Same precedent as adapters/telegram.adapter.ts's
// verifyTelegramBotToken, just for a two-piece credential instead of one.
//
// Because there's no app-level credential at all, WhatsApp's real gating
// env var is INTEGRATIONS_ENCRYPTION_KEY (needed to store the token safely)
// — not a WHATSAPP_* client id/secret, which wouldn't mean anything for a
// system-user-token integration. See connectors.service.ts's
// `computeConfigured` for whatsapp.

const GRAPH_API_VERSION = 'v19.0';

export interface WhatsAppPhoneIdentity {
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: string | null;
}

// Real Cloud API phone-number metadata endpoint
// (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers).
// A garbage token or phone_number_id gets a real, genuine rejection from
// Meta's own servers (invalid OAuth token, unsupported request, etc.) — that
// rejection reason is what's surfaced back to the caller, never a generic
// "failed" message.
export async function verifyWhatsAppCredentials(
  accessToken: string,
  phoneNumberId: string,
): Promise<WhatsAppPhoneIdentity> {
  const trimmedToken = (accessToken || '').trim();
  const trimmedPhoneId = (phoneNumberId || '').trim();
  if (!trimmedToken || !trimmedPhoneId) {
    throw new BadRequestException('Both an access token and a phone number ID are required to connect WhatsApp.');
  }
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(trimmedPhoneId)}?fields=verified_name,display_phone_number,quality_rating`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${trimmedToken}` },
    });
  } catch (e: any) {
    throw new BadRequestException(`Couldn't reach Meta's Graph API to verify these WhatsApp credentials: ${e.message || 'network error'}.`);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const message = data.error?.message || `HTTP ${res.status}`;
    throw new BadRequestException(
      `Meta rejected this WhatsApp access token / phone number ID: ${message}. Double-check both values from Meta Business Manager (business.facebook.com).`,
    );
  }
  return {
    phoneNumberId: trimmedPhoneId,
    displayPhoneNumber: data.display_phone_number,
    verifiedName: data.verified_name,
    qualityRating: data.quality_rating ?? null,
  };
}

// Real Cloud API send-message endpoint
// (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages).
// Note: outside Meta's 24-hour customer-service window, a business can only
// message a user with a pre-approved message TEMPLATE, not free-form text —
// this sends a free-form text message, which will fail with a real Meta
// error ("re-engagement message" / template required) if that window has
// closed for the given recipient. That failure surfaces honestly here too,
// never silently swallowed.
export async function sendWhatsAppMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string,
): Promise<{ messageId: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const message = data.error?.message || `HTTP ${res.status}`;
    throw new BadRequestException(`Failed to send WhatsApp message: ${message}`);
  }
  return { messageId: data.messages?.[0]?.id };
}
