# Claude Instructions for GitDepSec

## Skills Reference

Before working on any feature, read the relevant skill files from `.agents/skills`:

| Task | Skill File |
|------|------------|
| UI components, styling, React patterns | `ui-components.md`, `vercel-react-best-practices/`, `web-design-guidelines/`. `frontend-design`  |
| Backend/Node.js code | `nodejs-backend-patterns/` |
| Fix plan features | `fix-plan-generation.md` |
| Database schema, Drizzle ORM | `database-schema.md` |
| Dependency audit | `audit-dependencies.md` |
| Writing tests | `testing.md` |

## Project Structure

- **Frontend**: Next.js app in `src/` with Zustand state management in `src/store/`
- **Backend**: Express server in `backend/` with Drizzle ORM for SQLite
- **Components**: Shadcn/ui components in `src/components/ui/`

## IMPORTANT
 - **Use shadcn components present in src/ui**
 - **Use colors from globals.css and also make changes there if last resort, this will help keep code modular and clean**

## Key Patterns

- Use Zustand selectors from `src/store/app-store.ts` for state
- Follow existing component patterns in `src/components/`
- Backend services are in `backend/service/`
- API routes use SSE for streaming responses

## Before Making Changes

1. Read the relevant skill file(s) for context
2. Check existing patterns in similar files
3. Follow the established conventions in this codebase
