import { prisma } from '../../database/prisma'

export const PHONE_TEMP_EMAIL_DOMAIN = 'phone.gm-ai.local'

export function isPhoneTempEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PHONE_TEMP_EMAIL_DOMAIN}`)
}

export async function hasPendingInviteForPhone(phone: string): Promise<boolean> {
  const count = await prisma.whatsappInvite.count({
    where: { phoneNumber: phone, status: 'pending', expiresAt: { gt: new Date() } },
  })
  return count > 0
}

export async function consumeInviteForVerifiedPhone(userId: string, phone: string): Promise<void> {
  await prisma.$transaction(async (txn) => {
    const invite = await txn.whatsappInvite.findFirst({
      where: { phoneNumber: phone, status: 'pending', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!invite) return

    const claim = await txn.whatsappInvite.updateMany({
      where: { id: invite.id, status: 'pending' },
      data: { status: 'redeemed', redeemedAt: new Date() },
    })
    if (claim.count === 0) return

    // Keep phoneVerifiedAt (PhoneService's flag) in sync with the plugin's
    // phoneNumberVerified so invited users aren't seen as unverified downstream.
    await txn.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } })

    const anchor = new Date()
    await txn.organizationMember.upsert({
      where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
      create: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
        venueIds: invite.venueIds,
        onboardingStartedAt: anchor,
      },
      update: {},
    })
    await txn.$executeRaw`
      UPDATE "organization_members"
      SET "onboardingStartedAt" = GREATEST(COALESCE("onboardingStartedAt", ${anchor}), ${anchor})
      WHERE "userId" = ${userId} AND "organizationId" = ${invite.organizationId}
    `
  })
}
