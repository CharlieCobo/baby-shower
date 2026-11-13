import { useEffect } from 'react'
import { es } from '../../i18n/es'
import { useAppStore } from '../services'
import { Icon } from './Icon'

const TOAST_MS = 5000

/** Aviso flotante sobre la barra inferior; los lectores de pantalla lo anuncian. */
export function ToastHost() {
  const toast = useAppStore((s) => s.toast)
  const dismiss = useAppStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismiss, TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast, dismiss])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-gutter"
    >
      {toast && (
        <div
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-[440px] items-center justify-between gap-2 rounded-full px-space-md py-2.5 shadow-[0_10px_25px_-5px_rgba(74,31,61,0.2)] ${
            toast.tone === 'error'
              ? 'bg-inverse-surface text-inverse-on-surface'
              : 'bg-surface-container-lowest text-on-surface'
          }`}
        >
          <p className="min-w-0 font-label-md text-label-md">{toast.message}</p>
          <button
            type="button"
            aria-label={es.common.close}
            onClick={dismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}
    </div>
  )
}
