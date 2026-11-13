interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

/** Icono de Material Symbols; decorativo (oculto a lectores de pantalla). */
export function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
    >
      {name}
    </span>
  )
}
