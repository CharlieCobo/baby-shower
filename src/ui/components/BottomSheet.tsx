import { useEffect, useId, useRef, type ReactNode } from 'react'
import { es } from '../../i18n/es'
import { Icon } from './Icon'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Formularios: contenido alineado a la izquierda y con scroll propio. */
  form?: boolean
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, [tabindex="0"]'

/**
 * Hoja inferior modal: atrapa el foco, se cierra con Escape o tocando el fondo
 * y devuelve el foco al elemento que la abrió.
 */
export function BottomSheet({ open, title, onClose, children, form = false }: BottomSheetProps) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  // Se guarda en una ref para no reiniciar el efecto (y el foco) en cada render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const sheet = sheetRef.current
    const focusables = () => [...(sheet?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    // El primer botón de acción (no el de cerrar) recibe el foco.
    ;(focusables()[1] ?? focusables()[0])?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-y-auto rounded-t-[32px] bg-surface-container-lowest p-space-lg pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_35px_rgba(74,31,61,0.25)] ${
          form ? 'items-stretch text-left' : 'items-center text-center'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={es.common.close}
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
        <div
          aria-hidden="true"
          className="mt-0.5 mb-space-md h-1.5 w-12 rounded-full bg-outline-variant"
        />
        <h2 id={titleId} className="mb-2 px-8 font-headline-sm text-headline-sm text-on-surface">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
