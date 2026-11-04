import { Link } from '@tanstack/react-router'
import { pl } from '@/i18n/pl'

export function NotFound() {
  return (
    <div className="mt-16 text-center">
      <h1 className="text-xl font-semibold">{pl.notFound.title}</h1>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-text">
        {pl.notFound.home}
      </Link>
    </div>
  )
}
