import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AppController } from './app.controller'
import { AdaptationModule } from './modules/adaptation/adaptation.module'
import { AuthModule } from './modules/auth/auth.module'
import { OrgContextMiddleware } from './modules/auth/org-context.middleware'
import { ChatModule } from './modules/chat/chat.module'
import { DebugModule } from './modules/debug/debug.module'
import { DocsModule } from './modules/docs/docs.module'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'
import { IngestModule } from './modules/ingest/ingest.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { MockOpsModule } from './modules/mock-ops/mock-ops.module'
import { PhoneModule } from './modules/phone/phone.module'
import { RetrievalModule } from './modules/retrieval/retrieval.module'
import { SuggestionsModule } from './modules/suggestions/suggestions.module'
import { VenuesModule } from './modules/venues/venues.module'

@Module({
  imports: [
    AuthModule,
    EmbeddingsModule,
    IngestModule,
    MockOpsModule,
    RetrievalModule,
    AdaptationModule,
    ChatModule,
    SuggestionsModule,
    VenuesModule,
    DebugModule,
    DocsModule,
    InvitationsModule,
    PhoneModule,
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
