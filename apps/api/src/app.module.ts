import { BullModule } from '@nestjs/bullmq'
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { AppController } from './app.controller'
import { AdaptationModule } from './modules/adaptation/adaptation.module'
import { AuthModule } from './modules/auth/auth.module'
import { OrgContextMiddleware } from './modules/auth/org-context.middleware'
import { ChatModule } from './modules/chat/chat.module'
import { ChatCoreModule } from './modules/chat-core/chat-core.module'
import { ChatStartersModule } from './modules/chat-starters/chat-starters.module'
import { ComplianceModule } from './modules/compliance/compliance.module'
import { DebugModule } from './modules/debug/debug.module'
import { DocsModule } from './modules/docs/docs.module'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'
import { IncidentsModule } from './modules/incidents/incidents.module'
import { IngestModule } from './modules/ingest/ingest.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { SquareModule } from './modules/integrations/square/square.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { OnboardingMetricsModule } from './modules/metrics/onboarding/onboarding-metrics.module'
import { MockOpsModule } from './modules/mock-ops/mock-ops.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { NudgeModule } from './modules/nudges/nudge.module'
import { PhoneModule } from './modules/phone/phone.module'
import { PricingRecommendationsModule } from './modules/pricing-recommendations/pricing-recommendations.module'
import { ProactiveBrainModule } from './modules/proactive-brain/proactive-brain.module'
import { ReportsModule } from './modules/reports/reports.module'
import { RetrievalModule } from './modules/retrieval/retrieval.module'
import { ScheduledReportsModule } from './modules/scheduled-reports/scheduled-reports.module'
import { SuggestionsModule } from './modules/suggestions/suggestions.module'
import { TasksModule } from './modules/tasks/tasks.module'
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
    ChatCoreModule,
    ChatModule,
    SuggestionsModule,
    VenuesModule,
    DebugModule,
    DocsModule,
    InvitationsModule,
    PhoneModule,
    WhatsappModule,
    NudgeModule,
    NotificationsModule,
    TasksModule,
    ReportsModule,
    ScheduledReportsModule,
    ComplianceModule,
    ChatStartersModule,
    IntegrationsModule,
    SquareModule,
    MetricsModule,
    OnboardingMetricsModule,
    IncidentsModule,
    PricingRecommendationsModule,
    ProactiveBrainModule,
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
