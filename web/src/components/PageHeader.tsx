interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{description}</p>
      )}
    </header>
  )
}
