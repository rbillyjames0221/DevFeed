'use client';

import { Icons } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminLoginAction, loginAction } from '@/features/auth/actions';
import {
  adminLoginSchema,
  loginSchema,
  type AdminLoginInput,
  type LoginInput
} from '@/features/auth/schema';
import { useAppForm } from '@/lib/form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const defaultGitValues: LoginInput = {
  provider: 'github',
  token: '',
  gitlabBaseUrl: 'https://gitlab.com'
};

const defaultAdminValues: AdminLoginInput = {
  username: '',
  password: ''
};

interface LoginFormProps {
  /** Providers with an OAuth app configured; each gets a "Continue with …" button. */
  oauthProviders: ('github' | 'gitlab')[];
  /** A failed OAuth round trip comes back as `?error=`. */
  initialError?: string;
}

const OAUTH_BUTTONS = {
  github: { label: 'Continue with GitHub', icon: Icons.github },
  gitlab: { label: 'Continue with GitLab', icon: Icons.gitlab }
} as const;

function AdminSubForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState<string | undefined>();
  const form = useAppForm({
    defaultValues: defaultAdminValues,
    validators: { onSubmit: adminLoginSchema },
    onSubmit: async ({ value }) => {
      setError(undefined);
      const result = await adminLoginAction(value);
      if (!result.ok) {
        setError(result.error ?? 'Could not sign in as admin');
        return;
      }
      onSuccess();
    }
  });

  return (
    <div className='space-y-4'>
      <div className='bg-muted/50 rounded-lg border p-3 text-xs leading-relaxed text-muted-foreground'>
        Direct sign-in using the admin credentials configured in your environment (<code className='text-foreground font-mono font-medium'>.env</code>).
      </div>
      <form
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.AppForm>
          <form.AppField
            name='username'
            children={(field) => (
              <field.TextField
                label='Username or email'
                placeholder='admin'
                autoComplete='username'
                required
              />
            )}
          />

          <form.AppField
            name='password'
            children={(field) => (
              <field.TextField
                label='Password'
                type='password'
                placeholder='••••••••'
                autoComplete='current-password'
                required
              />
            )}
          />

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form.SubmitButton size='lg' className='w-full'>
            Sign in as Admin
          </form.SubmitButton>
        </form.AppForm>
      </form>
    </div>
  );
}

function GitSubForm({
  oauthProviders,
  initialError,
  onSuccess
}: {
  oauthProviders: ('github' | 'gitlab')[];
  initialError?: string;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | undefined>(initialError);
  const form = useAppForm({
    defaultValues: defaultGitValues,
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError(undefined);
      const result = await loginAction(value);
      if (!result.ok) {
        setError(result.error ?? 'Could not sign in');
        return;
      }
      onSuccess();
    }
  });

  return (
    <div className='space-y-5'>
      {oauthProviders.length > 0 && (
        <>
          <div className='grid gap-2'>
            {oauthProviders.map((provider) => {
              const { label, icon: Icon } = OAUTH_BUTTONS[provider];
              return (
                <a
                  key={provider}
                  href={`/api/auth/${provider}`}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'w-full'
                  })}
                >
                  <Icon aria-hidden='true' />
                  {label}
                </a>
              );
            })}
          </div>
          <div className='text-muted-foreground flex items-center gap-3 text-xs'>
            <span className='bg-border h-px flex-1' />
            or use personal access token
            <span className='bg-border h-px flex-1' />
          </div>
        </>
      )}

      <div className='bg-muted/50 rounded-lg border p-3 text-xs leading-relaxed text-muted-foreground'>
        Sign in with your GitHub Personal Access Token. Need a token?{' '}
        <a
          href='https://github.com/settings/tokens/new?description=DevFeed&scopes=repo,read:org,read:user'
          target='_blank'
          rel='noopener noreferrer'
          className='text-primary font-medium underline underline-offset-4 hover:opacity-80'
        >
          Generate a Classic PAT with pre-filled scopes &rarr;
        </a>
      </div>

      <form
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.AppForm>
          <form.AppField
            name='provider'
            children={(field) => (
              <field.SelectField
                label='Provider'
                required
                options={[
                  { value: 'github', label: 'GitHub' },
                  { value: 'gitlab', label: 'GitLab' }
                ]}
              />
            )}
          />

          <form.Subscribe selector={(state) => state.values.provider}>
            {(provider) =>
              provider === 'gitlab' ? (
                <form.AppField
                  name='gitlabBaseUrl'
                  children={(field) => (
                    <field.TextField
                      label='GitLab URL'
                      type='url'
                      autoComplete='url'
                      description='Your own instance, or gitlab.com. Prefer https when the host supports it.'
                      required
                    />
                  )}
                />
              ) : null
            }
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.values.provider}>
            {(provider) => (
              <form.AppField
                name='token'
                children={(field) => (
                  <field.TextField
                    label='Personal access token'
                    type='password'
                    placeholder={provider === 'github' ? 'ghp_...' : 'glpat-...'}
                    autoComplete='off'
                    spellCheck={false}
                    description={
                      provider === 'github'
                        ? 'GitHub Classic PAT with repo, read:org, and read:user scopes.'
                        : 'GitLab personal access token with read_api and read_user scopes.'
                    }
                    required
                  />
                )}
              />
            )}
          </form.Subscribe>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form.SubmitButton size='lg' className='w-full'>
            Connect and sign in
          </form.SubmitButton>
        </form.AppForm>
      </form>
    </div>
  );
}

export function LoginForm({ oauthProviders, initialError }: LoginFormProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.replace('/');
    router.refresh();
  };

  return (
    <div className='space-y-4'>
      <Tabs defaultValue='admin' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='admin' className='flex items-center gap-1.5'>
            <Icons.user className='size-3.5' />
            Admin Login
          </TabsTrigger>
          <TabsTrigger value='git' className='flex items-center gap-1.5'>
            <Icons.github className='size-3.5' />
            GitHub / Git
          </TabsTrigger>
        </TabsList>

        <TabsContent value='admin' className='pt-2'>
          <AdminSubForm onSuccess={handleSuccess} />
        </TabsContent>

        <TabsContent value='git' className='pt-2'>
          <GitSubForm
            oauthProviders={oauthProviders}
            initialError={initialError}
            onSuccess={handleSuccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
