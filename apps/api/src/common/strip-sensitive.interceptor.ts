import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { stripSensitiveDeep } from './strip-sensitive.util';

// Registered globally (see app.module.ts) — deletes passwordHash/
// encryptedSeed from every REST response body, regardless of which
// controller or query produced it. See strip-sensitive.util.ts for why this
// runs at the response boundary rather than being scoped per-query.
//
// Does not cover Socket.IO gateway emissions (a separate response path,
// outside Nest's HTTP interceptor chain) — audited at the time this was
// added and no gateway emits a raw user/wallet object, but a new gateway
// handler that does would not be caught here.
@Injectable()
export class StripSensitiveInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => stripSensitiveDeep(data)));
  }
}
