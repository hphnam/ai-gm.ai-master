import { BullModule } from '@nestjs/bullmq'
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { AppController } from './app.controller'
import { AdaptationModule } from './modules/adaptation/adaptation.module'
import { AuthModule } from './modules/auth/auth.module'
import { OrgContextMiddleware } from './modules/auth/org-context.middleware'
import { ChatModule } from './modules/chat/chat.module'
import { ChatV2Module } from './modules/chat-v2/chat-v2.module'
import { DebugModule } from './modules/debug/debug.module'
import { DocsModule } from './modules/docs/docs.module'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'
import { IngestModule } from './modules/ingest/ingest.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { MockOpsModule } from './modules/mock-ops/mock-ops.module'
import { NudgeModule } from './modules/nudges/nudge.module'
import { PhoneModule } from './modules/phone/phone.module'
import { RetrievalModule } from './modules/retrieval/retrieval.module'
import { SuggestionsModule } from './modules/suggestions/suggestions.module'
import { VenuesModule } from './modules/venues/venues.module'
import { WhatsappModule } from './modules/whatsapp/whatsapp.module'

@Module({
  imports: [
    BullModule.forRoot({
      connection: parseRedisUrl(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'),
    }),
    AuthModule,
    EmbeddingsModule,
    IngestModule,
    MockOpsModule,
    RetrievalModule,
    AdaptationModule,
    ChatV2Module,
    ChatModule,
    SuggestionsModule,
    VenuesModule,
    DebugModule,
    DocsModule,
    InvitationsModule,
    PhoneModule,
    WhatsappModule,
    NudgeModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // OrgContextMiddleware resolves req.user / req.organization / req.membership
    // for every non-auth route. AuthGuard (per-controller) decides whether to 401.
    consumer.apply(OrgContextMiddleware).exclude('api/auth/{*path}').forRoutes('*path')
  }
}

/// Parse a Redis URL into the connection options BullMQ wants. Accepts
/// redis:// and rediss:// (TLS). Falls back to localhost:6379 if env unset.
function parseRedisUrl(raw: string): {
  host: string
  port: number
  username?: string
  password?: string
  tls?: object
} {
  try {
    const u = new URL(raw)
    const opts: ReturnType<typeof parseRedisUrl> = {
      host: u.hostname || '127.0.0.1',
      port: u.port ? Number(u.port) : 6379,
    }
    if (u.username) opts.username = decodeURIComponent(u.username)
    if (u.password) opts.password = decodeURIComponent(u.password)
    if (u.protocol === 'rediss:') opts.tls = {}
    return opts
  } catch {
    return { host: '127.0.0.1', port: 6379 }
  }
}
