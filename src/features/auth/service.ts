import { GitProvider, UserRole } from '@/generated/prisma/client';
import { isDemoMode } from '@/lib/demo';
import type { AdminLoginInput, LoginResult } from '@/features/auth/schema';
import { getAppUrl, getOAuthConfig } from '@/lib/auth/oauth';
import { createSession } from '@/lib/auth/session';
import { decideRegistration } from '@/lib/auth/registration-policy';
import { getPrisma } from '@/lib/db/prisma';
import { encryptSecret, getEncryptionKey } from '@/lib/encryption/secrets';
import { createGitHubProvider } from '@/lib/git/github';
import { createGitLabProvider } from '@/lib/git/gitlab';
import {
  getAllowedOrganizations,
  isMembershipAllowed,
  normalizeGitLabBaseUrl,
  ProviderAuthenticationError,
  type GitProviderId
} from '@/lib/git/provider';

export function providerIsEnabled(provider: GitProviderId): boolean {
  // The public demo signs people in with throwaway accounts only.
  if (isDemoMode()) return false;
  const enabled = (process.env.DEVFEED_AUTH_PROVIDERS ?? 'github,gitlab')
    .split(',')
    .map((value) => value.trim().toLowerCase());
  return enabled.includes(provider);
}

/** Providers whose "Continue with …" button can be offered on the login page. */
export function oauthSignInProviders(): GitProviderId[] {
  if (!getAppUrl()) return [];
  return (['github', 'gitlab'] as const).filter(
    (provider) => providerIsEnabled(provider) && getOAuthConfig(provider) !== null
  );
}

export interface TokenSignIn {
  provider: GitProviderId;
  token: string;
  gitlabBaseUrl?: string;
  /** Only OAuth sign-ins with expiring tokens have these; personal access tokens clear them. */
  refreshToken?: string | null;
  expiresAt?: Date | null;
}

/**
 * Signs in with a provider token, whether pasted or issued by OAuth: checks the
 * identity and org rules, stores the token encrypted, and starts a session.
 */
export async function signInWithToken({
  provider,
  token,
  gitlabBaseUrl,
  refreshToken = null,
  expiresAt = null
}: TokenSignIn): Promise<LoginResult> {
  try {
    const client =
      provider === 'github'
        ? createGitHubProvider()
        : createGitLabProvider(await normalizeGitLabBaseUrl(gitlabBaseUrl || 'https://gitlab.com'));
    const identity = await client.getIdentity(token);

    // Checked on every sign-in, not only registration, so losing org membership revokes access.
    const allowedOrganizations = getAllowedOrganizations(provider);
    if (allowedOrganizations.length > 0) {
      const memberships = await client.getMemberships(token);
      if (!isMembershipAllowed(memberships, allowedOrganizations)) {
        throw new Error('ORGANIZATION_NOT_ALLOWED');
      }
    }

    const prismaProvider = provider === 'github' ? GitProvider.GITHUB : GitProvider.GITLAB;
    const key = getEncryptionKey();
    const encryptedToken = encryptSecret(token, key);
    const tokenFields = {
      encryptedToken,
      encryptedRefreshToken: refreshToken ? encryptSecret(refreshToken, key) : null,
      tokenExpiresAt: expiresAt
    };

    const user = await getPrisma().$transaction(async (transaction) => {
      let existing = await transaction.user.findUnique({
        where: {
          provider_providerUserId: {
            provider: prismaProvider,
            providerUserId: identity.providerUserId
          }
        }
      });
      if (!existing) {
        existing = await transaction.user.findFirst({
          where: {
            username: { equals: identity.username, mode: 'insensitive' }
          }
        });
        if (existing) {
          existing = await transaction.user.update({
            where: { id: existing.id },
            data: {
              provider: prismaProvider,
              providerUserId: identity.providerUserId
            }
          });
        }
      }
      const userCount = existing ? 1 : await transaction.user.count();

      const registration = decideRegistration(
        Boolean(existing),
        userCount,
        process.env.DEVFEED_ALLOW_BOOTSTRAP === 'true',
        process.env.DEVFEED_ALLOW_REGISTRATION === 'true'
      );

      if (existing?.disabledAt) throw new Error('USER_DISABLED');
      if (registration === 'bootstrap-disabled') throw new Error('BOOTSTRAP_DISABLED');
      if (registration === 'registration-disabled') {
        throw new Error('REGISTRATION_DISABLED');
      }

      const savedUser = await transaction.user.upsert({
        where: {
          provider_providerUserId: {
            provider: prismaProvider,
            providerUserId: identity.providerUserId
          }
        },
        create: {
          provider: prismaProvider,
          providerUserId: identity.providerUserId,
          username: identity.username,
          name: identity.name,
          avatarUrl: identity.avatarUrl,
          role: registration === 'admin' ? UserRole.ADMIN : UserRole.MEMBER
        },
        update: {
          username: identity.username,
          name: identity.name,
          avatarUrl: identity.avatarUrl,
          lastLoginAt: new Date()
        }
      });

      await transaction.gitConnection.upsert({
        where: {
          userId_provider_baseUrl: {
            userId: savedUser.id,
            provider: prismaProvider,
            baseUrl: identity.baseUrl
          }
        },
        create: {
          userId: savedUser.id,
          provider: prismaProvider,
          providerUserId: identity.providerUserId,
          baseUrl: identity.baseUrl,
          ...tokenFields
        },
        update: { providerUserId: identity.providerUserId, ...tokenFields }
      });

      return savedUser;
    });

    await createSession(user.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof ProviderAuthenticationError) {
      return { ok: false, error: 'The provider rejected this token' };
    }
    if (error instanceof Error && error.message === 'ORGANIZATION_NOT_ALLOWED') {
      return { ok: false, error: 'Your account is not in an organization allowed to use DevFeed' };
    }
    if (error instanceof Error && error.message === 'REGISTRATION_DISABLED') {
      return { ok: false, error: 'Registration is disabled for this installation' };
    }
    if (error instanceof Error && error.message === 'USER_DISABLED') {
      return { ok: false, error: 'This account has been disabled by an administrator' };
    }
    if (error instanceof Error && error.message === 'BOOTSTRAP_DISABLED') {
      return { ok: false, error: 'Administrator bootstrap is disabled for this installation' };
    }
    if (error instanceof Error && error.message.includes('GitLab')) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Could not sign in. Check the provider and try again.' };
  }
}

export function isAdminAuthEnabled(): boolean {
  const envVal =
    process.env.DEVFEED_ENABLE_ADMIN_LOGIN ?? process.env.DEVFEED_ALLOW_ADMIN_LOGIN;
  if (envVal !== undefined) {
    const normalized = envVal.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export async function signInWithAdminCredentials({
  username,
  password
}: AdminLoginInput): Promise<LoginResult> {
  if (!isAdminAuthEnabled()) {
    return { ok: false, error: 'Admin login is disabled' };
  }

  const configuredUser = (process.env.DEVFEED_ADMIN_USERNAME ?? 'admin').trim().toLowerCase();
  const configuredEmail = (process.env.DEVFEED_ADMIN_EMAIL ?? 'admin@devfeed.local').trim().toLowerCase();
  const configuredPass = process.env.DEVFEED_ADMIN_PASSWORD ?? 'admin';
  const configuredName = process.env.DEVFEED_ADMIN_NAME ?? 'DevFeed Administrator';

  const inputUser = username.trim().toLowerCase();
  const userMatches = inputUser === configuredUser || inputUser === configuredEmail;
  const passMatches = password === configuredPass;

  if (!userMatches || !passMatches) {
    return { ok: false, error: 'Invalid admin username or password' };
  }

  try {
    const user = await getPrisma().user.upsert({
      where: {
        provider_providerUserId: {
          provider: GitProvider.GITHUB,
          providerUserId: 'local-admin'
        }
      },
      create: {
        provider: GitProvider.GITHUB,
        providerUserId: 'local-admin',
        username: process.env.DEVFEED_ADMIN_USERNAME?.trim() || 'admin',
        name: configuredName,
        role: UserRole.ADMIN,
        avatarUrl: null
      },
      update: {
        username: process.env.DEVFEED_ADMIN_USERNAME?.trim() || 'admin',
        name: configuredName,
        role: UserRole.ADMIN,
        lastLoginAt: new Date()
      }
    });

    if (user.disabledAt) {
      return { ok: false, error: 'This admin account has been disabled' };
    }

    await createSession(user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not complete admin sign-in' };
    }
}
