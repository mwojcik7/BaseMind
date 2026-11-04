import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { api } from '@/lib/api'
import { showFormError } from '@/lib/form-errors'
import { forgotPasswordSchema } from '@/modules/auth/schemas'

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await api.post('/api/auth/forgot-password', data)
      setSent(true)
    } catch (error) {
      showFormError(error, setError, ['email'])
    }
  })

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{pl.auth.forgotTitle}</h1>
      {sent ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {pl.auth.forgotSent}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{pl.auth.forgotIntro}</p>
          <FormField
            id="email"
            label={pl.auth.email}
            type="email"
            autoComplete="username"
            inputMode="email"
            error={errors.email?.message}
            {...register('email')}
          />
          {errors.root && (
            <p role="alert" className="text-sm text-danger">
              {errors.root.message}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {pl.auth.forgotAction}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 text-sm font-medium text-brand-text">
        {pl.auth.backToLogin}
      </Link>
    </>
  )
}
