import { Link } from 'react-router'
import { es } from '../../i18n/es'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-headline-md text-headline-md">{es.pages.notFound.title}</h1>
      <Link to="/" className="font-label-lg text-label-lg text-primary underline">
        {es.pages.notFound.back}
      </Link>
    </main>
  )
}
