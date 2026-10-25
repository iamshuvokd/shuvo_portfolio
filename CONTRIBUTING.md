# Contributing

Thanks for helping improve this project. These rules keep `main` always deployable.

## Workflow

1. Branch from `main`: `git switch -c fix/short-description`
2. Make the change **with a test** that fails without it (bug fixes especially).
3. Run everything CI will run:
   ```sh
   npm run redis         # once: Redis for the tests
   npm run check         # lint + type-check + backend tests + end-to-end tests
   ```
4. Open a pull request. CI must be green; merging to `main` deploys automatically (see `docs/CICD.md`).

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `fix(projects): hide empty link buttons`,
`feat(admin): add file cleanup`, `perf: …`, `docs: …`, `chore(deps): …`. Explain **why** in the body, not just what.

## Code conventions

- **TypeScript everywhere.** The backend is strict; do not weaken it. Prefer types from `frontend/src/types/content.ts`.
- **Layers:** backend `routes` parse input and call `services`; only `services` touch Redis. Frontend components never call
  `fetch`; they use `services/`.
- **Content model changes** touch four places (see `docs/ARCHITECTURE.md`); the e2e + default-content tests catch a miss.
- **Validate at the edge:** user input goes through a zod schema; links are restricted to safe schemes.
- **Accessibility is tested** (axe-core). New UI needs labels, keyboard access and sensible landmarks.
- **No secrets in the repo**, ever. `.env` files are git-ignored; document new variables in the matching `.env.example`.
- Keep performance budgets (`npm run check:size` after a build): initial JS < 280 KB gzip, images < 120 KB.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | API + site with hot reload (http://localhost:8080, admin at `/admin`) |
| `npm test` | backend unit/integration tests |
| `npm run test:e2e` | full browser suite on an isolated stack |
| `npm run test:e2e:ui` | same, interactive |
| `npm run og:image` / `npm run images` | regenerate the social card / web-sized photos |
| `npm run prod:local` | run the production Docker stack locally |
