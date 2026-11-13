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

## Despliegue

Cada push a `main` pasa lint, tipos y tests y, si todo va bien, despliega en
https://charliecobo.github.io/baby-shower/. Las variables `VITE_*` se leen del entorno
`github-pages` del repositorio.
