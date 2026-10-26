import { z } from 'zod';

export const loginSchema = z.object({
  provider: z.enum(['github', 'gitlab']),
  token: z.string().trim().min(20, 'Enter a valid personal access token').max(2048),
  gitlabBaseUrl: z.string().trim().max(2048).optional()
});

export type LoginInput = z.infer<typeof loginSchema>;

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Enter username or email'),
  password: z.string().min(1, 'Enter password')
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export interface LoginResult {
  ok: boolean;
  error?: string;
}
