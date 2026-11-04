import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { pl } from '@/i18n/pl'
import { ApiError, NetworkError } from '@/lib/api'

/** Text for a failed request that isn't tied to one form field. */
export function errorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return pl.errors.offline
  }
  if (error instanceof ApiError && error.status === 429) {
    return pl.errors.tooManyAttempts
  }
  return pl.errors.unexpected
}

/** Shows a failed submit on the form: next to its field when the server names one. */
export function showFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const fieldErrors = error instanceof ApiError ? Object.entries(error.errors) : []
  const known = fieldErrors.filter(([field]) => (fields as readonly string[]).includes(field))

  if (known.length === 0) {
    const message = fieldErrors[0]?.[1][0] ?? errorMessage(error)
    setError('root' as Path<T>, { message })
    return
  }

  for (const [field, messages] of known) {
    setError(field as Path<T>, { message: messages[0] })
  }
}
