import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  ConnectPatBodyDto,
  ListIntegrationsResponseDto,
  ProviderParamDto,
  SingleIntegrationResponseDto,
} from './dto/integrations.dto'
import { IntegrationRegistry } from './integration-registry'
import { IntegrationsService } from './integrations.service'
import { createRateLimiter } from './rate-limit'

/// Per-org throttle on connect-pat. Generous (10 / 15 min) — managers
/// rotating a token during incident response should not hit this; a buggy
/// integration UI or a stolen manager session that hammers the endpoint will.
const CONNECT_PAT_LIMITER = createRateLimiter(15 * 60_000, 10)

/// All connect/disconnect routes are owner|manager only. Staff can see WHICH
/// integrations are connected (via list) but cannot rotate tokens. We don't
/// expose the cleartext token via any GET — it stays encrypted at rest.
@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(AuthGuard, RoleGuard)
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name)

  constructor(
    private readonly service: IntegrationsService,
    private readonly registry: IntegrationRegistry,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: ListIntegrationsResponseDto })
  async list(@CurrentOrg() org: { id: string }): Promise<ListIntegrationsResponseDto> {
    const integrations = await this.service.list(org.id)
    return { integrations }
  }

  @Post(':provider/connect-pat')
  @HttpCode(201)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 201, type: SingleIntegrationResponseDto })
  async connectPat(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ProviderParamDto)) params: ProviderParamDto,
    @Body(new ZodValidationPipe(ConnectPatBodyDto)) body: ConnectPatBodyDto,
  ): Promise<SingleIntegrationResponseDto> {
    const provider = this.registry.getProvider(params.provider)
    if (!provider) {
      throw new BadRequestException({ error: 'unknown-provider' })
    }
    if (!CONNECT_PAT_LIMITER.allow(`${org.id}|${params.provider}`)) {
      throw new HttpException({ error: 'rate-limited' }, 429)
    }

    // Validate the token against the vendor BEFORE we persist it. Two
    // wins: (1) bad PATs are rejected with a clear error instead of being
    // stored and only failing the first time the chat agent calls the
    // integration, (2) we capture the vendor's account id so we can show
    // "Connected as <Acme Bar>" in the UI and detect "you reconnected with
    // a different merchant's token" as a future safety check.
    let validated: { externalAccountId: string | null; scopes?: string[] } | null = null
    if (provider.validateCredentials) {
      try {
        validated = await provider.validateCredentials({
          accessToken: body.accessToken,
          environment: body.environment ?? 'production',
        })
      } catch (err) {
        // Log the underlying error server-side so an operator can debug a
        // real outage vs. a bad PAT. Never echo the vendor's raw error
        // string to the user — it can contain attacker-influenced content
        // if the supplied token was crafted, and may leak internal
        // diagnostics (merchant id, device codes, etc.).
        this.logger.warn(
          JSON.stringify({
            event: 'integrations.validate_credentials_failed',
            orgId: org.id,
            provider: params.provider,
            message: ((err as Error).message ?? 'unknown').slice(0, 200),
          }),
        )
        throw new BadRequestException({
          error: 'credential-validation-failed',
          message: `${provider.label} rejected the token. Double-check it was copied in full and has the right environment (production / sandbox).`,
        })
      }
    }

    const integration = await this.service.connectPat(org.id, {
      provider: params.provider,
      accessToken: body.accessToken,
      environment: body.environment,
      // Prefer scopes/account id reported by the vendor over what the
      // operator hand-entered. Falls back to the body values if validation
      // wasn't implemented for this provider.
      scopes: validated?.scopes ?? body.scopes,
      externalAccountId: validated?.externalAccountId ?? body.externalAccountId ?? null,
      siblingProvidersInDomain: this.registry.siblingsInDomain(params.provider),
    })
    return { integration }
  }

  @Delete(':provider')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async disconnect(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ProviderParamDto)) params: ProviderParamDto,
  ): Promise<void> {
    await this.service.disconnect(org.id, params.provider)
  }
}
