import { zodResolver } from '@hookform/resolvers/zod'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { api, ApiError } from '@/lib/api'
import { showFormError } from '@/lib/form-errors'
import { resetPasswordSchema } from '@/modules/auth/schemas'

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

const route = getRouteApi('/_auth/reset-password')

export function ResetPasswordPage() {
  const { token, email } = route.useSearch()
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await api.post('/api/auth/reset-password', { ...data, token, email })
      setDone(true)
    } catch (error) {
      // A bad or expired link is reported on "email", which this form doesn't show.
      const linkExpired = error instanceof ApiError && error.errors.email !== undefined
      if (linkExpired) {
        setError('root', { message: pl.auth.resetLinkInvalid })
      } else {
        showFormError(error, setError, ['password', 'password_confirmation'])
      }
    }
  })

  const hasLink = Boolean(token && email)

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{pl.auth.resetTitle}</h1>
      {done && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {pl.auth.resetDone}
        </p>
      )}
      {!done && !hasLink && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {pl.auth.resetLinkInvalid}
        </p>
      )}
      {!done && hasLink && (
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
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
            {pl.auth.resetAction}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 text-sm font-medium text-brand-text">
        {pl.auth.backToLogin}
      </Link>
    </>
  )
}
