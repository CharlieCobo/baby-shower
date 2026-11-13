import { es } from '../../i18n/es'

export function LoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card bg-surface-container-lowest p-space-lg text-center shadow-card"
    >
      <p className="font-body-md text-body-md text-on-surface-variant">{es.common.loadError}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-full bg-primary-container px-6 font-label-lg text-label-lg text-on-primary-container"
        >
          {es.common.retry}
        </button>
      )}
    </div>
  )
}
