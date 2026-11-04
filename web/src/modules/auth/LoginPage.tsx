import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { logIn } from '@/lib/auth'
import { showFormError } from '@/lib/form-errors'
import { loginSchema } from '@/modules/auth/schemas'

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (data) => {
    try {
      // On success AuthLayout sees the new status and opens the app.
      await logIn(data)
    } catch (error) {
      showFormError(error, setError, ['email', 'password'])
    }
  })

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{pl.auth.loginTitle}</h1>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
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
          label={pl.auth.password}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {errors.root && (
          <p role="alert" className="text-sm text-danger">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {pl.auth.loginAction}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-3 text-sm">
        <Link to="/forgot-password" className="font-medium text-brand-text">
          {pl.auth.forgotLink}
        </Link>
        <Link to="/register" className="font-medium text-brand-text">
          {pl.auth.registerLink}
        </Link>
      </div>
    </>
  )
}
