import { BullModule } from '@nestjs/bullmq'
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AppController } from './app.controller'
import { AdaptationModule } from './modules/adaptation/adaptation.module'
import { AuthModule } from './modules/auth/auth.module'
import { OrgContextMiddleware } from './modules/auth/org-context.middleware'
import { VenueScopeGuard } from './modules/auth/venue-scope.guard'
import { ChatModule } from './modules/chat/chat.module'
import { ChatCoreModule } from './modules/chat-core/chat-core.module'
import { ChatStartersModule } from './modules/chat-starters/chat-starters.module'
import { ComplianceModule } from './modules/compliance/compliance.module'
import { DailySummaryModule } from './modules/daily-summary/daily-summary.module'
import { DebugModule } from './modules/debug/debug.module'
import { DocsModule } from './modules/docs/docs.module'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'
import { IncidentsModule } from './modules/incidents/incidents.module'
import { IngestModule } from './modules/ingest/ingest.module'
import { BrewwModule } from './modules/integrations/breww/breww.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { SquareModule } from './modules/integrations/square/square.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { OnboardingMetricsModule } from './modules/metrics/onboarding/onboarding-metrics.module'
import { MockOpsModule } from './modules/mock-ops/mock-ops.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { NudgeModule } from './modules/nudges/nudge.module'
import { MemoryReconcileModule } from './modules/organization/memory-reconcile.module'
import { OrganizationModule } from './modules/organization/organization.module'
import { PhoneModule } from './modules/phone/phone.module'
import { PlacesModule } from './modules/places/places.module'
import { PricingRecommendationsModule } from './modules/pricing-recommendations/pricing-recommendations.module'
import { ProactiveBrainModule } from './modules/proactive-brain/proactive-brain.module'
import { ReportsModule } from './modules/reports/reports.module'
import { RetrievalModule } from './modules/retrieval/retrieval.module'
import { ScheduledReportsModule } from './modules/scheduled-reports/scheduled-reports.module'
import { SuggestionsModule } from './modules/suggestions/suggestions.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { VenuesModule } from './modules/venues/venues.module'
import { WhatsappModule } from './modules/whatsapp/whatsapp.module'
import { parseRedisUrl } from './redis-connection'

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
    OrganizationModule,
    MemoryReconcileModule,
    PhoneModule,
    PlacesModule,
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
    BrewwModule,
    DailySummaryModule,
    MetricsModule,
    OnboardingMetricsModule,
    IncidentsModule,
    PricingRecommendationsModule,
    ProactiveBrainModule,
  ],
  controllers: [AppController],
  // Global backstop: hard-deny any request whose venueId target is outside the
  // caller's per-member venue scope. Runs after OrgContextMiddleware resolves
  // req.membership. Owners / unscoped members pass through untouched.
  providers: [{ provide: APP_GUARD, useClass: VenueScopeGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // OrgContextMiddleware resolves req.user / req.organization / req.membership
    // for every non-auth route. AuthGuard (per-controller) decides whether to 401.
    consumer.apply(OrgContextMiddleware).exclude('api/auth/{*path}').forRoutes('*path')
  }
}
