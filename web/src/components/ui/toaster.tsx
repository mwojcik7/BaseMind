import { Toaster as Sonner } from 'sonner'

export { toast } from 'sonner'

// Colors come from the design tokens, so toasts follow the theme chosen in settings.
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      // Keep toasts above the bottom navigation.
      mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-raised',
          title: 'font-medium',
          description: 'text-muted-foreground',
          actionButton: 'ml-auto shrink-0 font-medium text-brand-text',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
          warning: '[&_[data-icon]]:text-warning',
        },
      }}
    />
  )
}
