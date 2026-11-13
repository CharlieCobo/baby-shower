# baby-shower

Web del baby shower: invitación, lista de regalos anónima y RSVP. Vite + React + TypeScript,
Firebase (Firestore y Auth) y GitHub Pages. La planificación vive en `openspec/`.

## Puesta en marcha

Requisitos: Node 24, pnpm 9 y Java 21 (para los emuladores de Firebase).

```bash
pnpm install
cp .env.example .env.local   # rellénalo con la config web de Firebase
pnpm dev
```

Para trabajar contra los emuladores locales, pon `VITE_USE_EMULATORS=true` en `.env.local`
y arranca `pnpm emulators` en otra terminal.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm preview`
- `pnpm lint`, `pnpm typecheck`, `pnpm format` / `pnpm format:check`
- `pnpm test`: tests unitarios (Vitest)
- `pnpm test:rules`: tests de las reglas de Firestore contra el emulador
- `pnpm emulators`: emuladores de Auth y Firestore
- `pnpm deploy:rules`: despliega `firestore.rules`

## Datos de prueba y datos reales

- `pnpm seed:dev`: con el emulador arrancado (`pnpm emulators`), lo llena con datos de prueba
  generados con Faker: evento, ~20 regalos, reservas y 30 RSVPs. Opciones: `--lista-cerrada`,
  `--rsvp-cerrado`, `--sin-evento`. Los admins salen de `SEED_ADMIN_EMAILS` (por defecto
  `admin@example.com`).
- `pnpm seed:prod`: carga los datos reales (admins, evento y regalos) desde
  `scripts/seed-data.local.json` (plantilla en `scripts/seed-data.example.json`). Necesita
  `service-account.json` en la raíz (fuera del repo) y pide confirmación. Con `--emulator`
  se prueba contra el emulador.

## Despliegue

Cada push a `main` pasa lint, tipos y tests y, si todo va bien, despliega en
https://charliecobo.github.io/baby-shower/. Las variables `VITE_*` se leen del entorno
`github-pages` del repositorio.
