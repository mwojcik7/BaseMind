import { z } from 'zod'
import { pl } from '@/i18n/pl'

const email = z.email(pl.auth.emailInvalid)

// The server checks everything again; these only give quicker feedback.
const newPassword = {
  password: z.string().min(10, pl.auth.passwordTooShort),
  password_confirmation: z.string(),
}

function passwordsMatch(data: { password: string; password_confirmation: string }) {
  return data.password === data.password_confirmation
}

const matchError = { message: pl.auth.passwordsDiffer, path: ['password_confirmation'] }

export const loginSchema = z.object({
  email,
  password: z.string().min(1, pl.auth.passwordRequired),
})

export const registerSchema = z
  .object({
    display_name: z.string().trim().min(1, pl.auth.nameRequired),
    email,
    ...newPassword,
    invitation_code: z.string().trim().min(1, pl.auth.codeRequired),
  })
  .refine(passwordsMatch, matchError)

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object(newPassword).refine(passwordsMatch, matchError)
