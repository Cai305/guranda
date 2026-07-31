import { Injectable, BadRequestException } from '@nestjs/common';

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
}

// Proxies Giphy so the API key never reaches the client bundle — same reason
// AnthropicAdapter keeps ANTHROPIC_API_KEY server-side only.
@Injectable()
export class GifService {
  private get apiKey(): string | undefined {
    return process.env.GIPHY_API_KEY;
  }

  async search(query: string, limit = 24): Promise<GifResult[]> {
    if (!this.apiKey) {
      throw new BadRequestException(
        'GIFs are not configured on this server: set GIPHY_API_KEY in apps/api/.env and restart the API.',
      );
    }
    const endpoint = query?.trim()
      ? `https://api.giphy.com/v1/gifs/search?${new URLSearchParams({
          api_key: this.apiKey,
          q: query.trim(),
          limit: String(limit),
          rating: 'pg-13',
        })}`
      : `https://api.giphy.com/v1/gifs/trending?${new URLSearchParams({
          api_key: this.apiKey,
          limit: String(limit),
          rating: 'pg-13',
        })}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new BadRequestException(`GIF provider error: ${res.status}`);
    }
    const data = await res.json();
    return (data.data || [])
      .map((g: any) => ({
        id: g.id,
        url: g.images?.original?.url,
        previewUrl:
          g.images?.fixed_width_small?.url || g.images?.downsized_small?.url,
      }))
      .filter((g: GifResult) => g.url && g.previewUrl);
  }
}
