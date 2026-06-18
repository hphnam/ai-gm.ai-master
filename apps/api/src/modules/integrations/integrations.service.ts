import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { decryptToken, encryptToken } from './crypto'

export type ConnectPatInput = {
  provider: string
  accessToken: string
  environment?: 'production' | 'sandbox'
  scopes?: string[]
  externalAccountId?: string | null
  /// Other provider ids in the SAME domain as `provider` (e.g. when
  /// connecting Square the controller passes the future Toast / Lightspeed
  /// ids here). If any of them are currently `active` for this org, the
  /// connect is rejected — preventing the "two POS providers connected
  /// simultaneously, agent silently routes to the most-recent" failure mode.
  siblingProvidersInDomain?: string[]
}

export type IntegrationSummary = {
  provider: string
  status: 'active' | 'disconnected' | 'error'
  authMode: 'pat' | 'oauth'
  environment: string
  scopes: string[]
  externalAccountId: string | null
  lastError: string | null
  lastSyncedAt: string | null
  connectedAt: string
}

export type IntegrationCredentials = {
  provider: string
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date | null
  environment: string
  externalAccountId: string | null
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name)

  /// PAT path — upsert credentials. Existing rows are overwritten (so a
  /// manager can rotate a token without disconnect-then-reconnect). Role
  /// enforcement lives in the controller; this service trusts its callers.
  async connectPat(orgId: string, input: ConnectPatInput): Promise<IntegrationSummary> {
    // Domain exclusivity — refuse to connect a second provider in the same
    // capability category. Checked here (not as a DB constraint) because
    // Postgres can't express "unique on (orgId, domain) WHERE status='active'"
    // without an enum and the domain isn't a column we want to persist.
    if (input.siblingProvidersInDomain && input.siblingProvidersInDomain.length > 0) {
      const conflict = await prisma.integration.findFirst({
        where: {
          organizationId: orgId,
          status: 'active',
          provider: { in: input.siblingProvidersInDomain },
        },
        select: { provider: true },
      })
      if (conflict) {
        throw new BadRequestException({
          error: 'integration-domain-conflict',
          message: `Another integration (${conflict.provider}) is already connected in this category. Disconnect it first before connecting ${input.provider}.`,
        })
      }
    }
    const cipher = encryptToken(input.accessToken)
    const row = await prisma.integration.upsert({
      where: { organizationId_provider: { organizationId: orgId, provider: input.provider } },
      create: {
        organizationId: orgId,
        provider: input.provider,
        status: 'active',
        authMode: 'pat',
        accessTokenCipher: cipher,
        environment: input.environment ?? 'production',
        scopes: input.scopes ?? [],
        externalAccountId: input.externalAccountId ?? null,
      },
      update: {
        status: 'active',
        authMode: 'pat',
        accessTokenCipher: cipher,
        environment: input.environment ?? 'production',
        scopes: input.scopes ?? [],
        externalAccountId: input.externalAccountId ?? null,
        lastError: null,
      },
      select: this.summarySelect,
    })
    this.logger.log(
      JSON.stringify({
        event: 'integrations.connect_pat',
        orgId,
        provider: input.provider,
        environment: row.environment,
      }),
    )
    return this.toSummary(row)
  }

  async disconnect(orgId: string, provider: string): Promise<void> {
    const row = await prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
      select: { id: true },
    })
    if (!row) throw new NotFoundException({ error: 'integration-not-found' })
    await prisma.integration.update({
      where: { id: row.id },
      data: { status: 'disconnected' },
    })
    this.logger.log(JSON.stringify({ event: 'integrations.disconnect', orgId, provider }))
  }

  async list(orgId: string): Promise<IntegrationSummary[]> {
    const rows = await prisma.integration.findMany({
      where: { organizationId: orgId },
      select: this.summarySelect,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((r) => this.toSummary(r))
  }

  /// Decrypt-on-read. Returns null if the integration is missing OR not
  /// active. Callers are expected to check null and surface a "not connected"
  /// error to the user; the agent should never see a decrypted token.
  async getActiveCredentials(
    orgId: string,
    provider: string,
  ): Promise<IntegrationCredentials | null> {
    const row = await prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
      select: {
        accessTokenCipher: true,
        refreshTokenCipher: true,
        tokenExpiresAt: true,
        environment: true,
        externalAccountId: true,
        status: true,
        provider: true,
      },
    })
    if (!row || row.status !== 'active') return null
    return {
      provider: row.provider,
      accessToken: decryptToken(row.accessTokenCipher),
      refreshToken: row.refreshTokenCipher ? decryptToken(row.refreshTokenCipher) : null,
      tokenExpiresAt: row.tokenExpiresAt,
      environment: row.environment,
      externalAccountId: row.externalAccountId,
    }
  }

  /// Capability routing — given a tool that multiple providers may implement
  /// (e.g. Square + Toast both implementing `pos_search_items`), return the
  /// provider id this org has currently connected as active. Returns null if
  /// none of the candidate providers are connected for the org. Used by the
  /// IntegrationRegistry dispatch path to fan out the right way per org.
  async resolveActiveProvider(orgId: string, candidates: string[]): Promise<string | null> {
    if (candidates.length === 0) return null
    const row = await prisma.integration.findFirst({
      where: {
        organizationId: orgId,
        status: 'active',
        provider: { in: candidates },
      },
      // Most-recently-connected wins when an org somehow has two POS providers
      // active simultaneously (we don't enforce one-POS-per-org at the DB
      // level today — a UI guard, but defensive at dispatch).
      orderBy: { updatedAt: 'desc' },
      select: { provider: true },
    })
    return row?.provider ?? null
  }

  /// Provider-side hook to record a recoverable error (e.g. SDK 401 because
  /// the PAT was revoked). Flips the row to 'error' so the UI can surface a
  /// "reconnect" CTA; preserves the cipher so reconnect-with-rotation works.
  async markError(orgId: string, provider: string, message: string): Promise<void> {
    try {
      await prisma.integration.update({
        where: { organizationId_provider: { organizationId: orgId, provider } },
        data: { status: 'error', lastError: message.slice(0, 500) },
      })
    } catch (err) {
      // Best-effort: if the row vanished between use and mark we don't want
      // to interrupt the user-facing tool call. We DO log so a swallowed
      // Prisma error (lost connection, etc.) doesn't hide a real auth signal.
      this.logger.warn(
        JSON.stringify({
          event: 'integrations.mark_error_failed',
          orgId,
          provider,
          message: (err as Error).message,
        }),
      )
    }
  }

  /// Called by providers after a successful tool call to surface "last
  /// synced X minutes ago" in the UI. Best-effort but errors are logged so
  /// a swallowed Prisma failure doesn't hide a real outage.
  async touchLastSynced(orgId: string, provider: string): Promise<void> {
    try {
      await prisma.integration.update({
        where: { organizationId_provider: { organizationId: orgId, provider } },
        data: { lastSyncedAt: new Date(), lastError: null },
      })
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'integrations.touch_last_synced_failed',
          orgId,
          provider,
          message: (err as Error).message,
        }),
      )
    }
  }

  private readonly summarySelect = {
    provider: true,
    status: true,
    authMode: true,
    environment: true,
    scopes: true,
    externalAccountId: true,
    lastError: true,
    lastSyncedAt: true,
    createdAt: true,
  } as const

  private toSummary(row: {
    provider: string
    status: string
    authMode: string
    environment: string
    scopes: string[]
    externalAccountId: string | null
    lastError: string | null
    lastSyncedAt: Date | null
    createdAt: Date
  }): IntegrationSummary {
    return {
      provider: row.provider,
      status: row.status as IntegrationSummary['status'],
      authMode: row.authMode as IntegrationSummary['authMode'],
      environment: row.environment,
      scopes: row.scopes,
      externalAccountId: row.externalAccountId,
      lastError: row.lastError,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      connectedAt: row.createdAt.toISOString(),
    }
  }
}
