import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Outbox-pattern event log. `write()` returns a Prisma create-args object,
 * NOT a promise — callers spread it directly into an existing
 * `$transaction([...])` array or interactive callback alongside the domain
 * write it describes, so the event can never be committed without the change
 * it records (or vice versa). This is the seed of the Guranda Runtime's
 * Event Bus — see architecture doc §25.
 */
@Injectable()
export class EventBusService {
  write(type: string, aggregateId: string, payload: Record<string, unknown> = {}) {
    return {
      data: {
        type,
        aggregateId,
        payload: payload as Prisma.InputJsonValue,
      },
    };
  }
}
