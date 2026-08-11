import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

/**
 * UserCacheInterceptor extends the built-in CacheInterceptor to include the
 * authenticated user's ID in the cache key. This ensures that cached responses
 * for personalized endpoints are scoped per-user and never leaked across users.
 *
 * For unauthenticated / public routes the key falls back to the raw URL path
 * (same behaviour as the default CacheInterceptor).
 */
@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {
  override trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();

    // Resolve the base key synchronously — cast to string because the parent's
    // return type is `string | undefined` in NestJS 11 (not a Promise).
    const baseKey = super.trackBy(context) as string | undefined;

    if (!baseKey) return undefined;

    // Scope by user ID when available so user A can never see user B's cache.
    const userId: string | undefined = request.user?.userId ?? request.user?.id;
    if (userId) {
      return `${baseKey}:uid=${userId}`;
    }

    return baseKey;
  }
}
