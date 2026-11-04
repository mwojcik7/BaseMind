import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { register as registerAccount } from '@/lib/auth'
import { showFormError } from '@/lib/form-errors'
import { registerSchema } from '@/modules/auth/schemas'

type RegisterForm = z.infer<typeof registerSchema>

const FIELDS = [
  'display_name',
  'email',
  'password',
  'password_confirmation',
  'invitation_code',
] as const

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await registerAccount(data)
    } catch (error) {
      showFormError(error, setError, FIELDS)
    }
  })

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{pl.auth.registerTitle}</h1>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField
          id="invitation_code"
          label={pl.auth.invitationCode}
          autoComplete="off"
          autoCapitalize="none"
          error={errors.invitation_code?.message}
          {...register('invitation_code')}
        />
        <FormField
          id="display_name"
          label={pl.auth.displayName}
          autoComplete="name"
          error={errors.display_name?.message}
          {...register('display_name')}
        />
        <FormField
          id="email"
          label={pl.auth.email}
          type="email"
          autoComplete="username"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          id="password"
          label={pl.auth.newPassword}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          id="password_confirmation"
          label={pl.auth.confirmPassword}
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />
        {errors.root && (
          <p role="alert" className="text-sm text-danger">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {pl.auth.registerAction}
        </Button>
      </form>
      <Link to="/login" className="mt-6 text-sm font-medium text-brand-text">
        {pl.auth.backToLogin}
      </Link>
    </>
  )
}
