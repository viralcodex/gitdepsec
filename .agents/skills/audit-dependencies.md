# Analyze Dependencies Skill

This skill helps GitHub Copilot understand and work with dependency audit in this project.

## Context

This project is a dependency security audit tool that:

- Analyzes npm/package.json dependencies
- Identifies security vulnerabilities
- Uses AI to generate fix plans
- Visualizes dependency graphs
- Provides CVE information and remediation suggestions

## Key Components

### Backend Services

- **audit_service.ts**: Core dependency audit logic
- **agents_service.ts**: AI agent coordination for fix plans
- **ai_service.ts**: AI/LLM integration (OpenAI, OpenRouter)
- **github_service.ts**: GitHub repository integration
- **progress_service.ts**: Real-time progress tracking

### Frontend Components

- **dependency-diagram.tsx**: Interactive dependency visualization
- **dependency-list.tsx**: List view of dependencies
- **fix-plan/**: AI-generated fix plan components
- **dependency-sidebar/**: Detailed dependency information

### Database Schema

- Uses Drizzle ORM
- Stores audit history, fix plans, and user data
- PostgreSQL database

## Common Tasks

When working with dependencies:

1. Parse package.json and lock files
2. Query vulnerability databases (CVEs)
3. Generate fix plans using AI agents
4. Track audit progress
5. Store results in database

## Code Patterns

### Analyzing a Repository

```typescript
const result = await analyzeRepository(repoUrl, options);
```

### Creating Fix Plans

```typescript
const fixPlan = await generateFixPlan(vulnerabilities, context);
```

### Database Queries

```typescript
const analysis = await db.query.analyses.findFirst({
  where: eq(analyses.id, analysisId),
});
```

## Important Files

- `/backend/service/audit_service.ts` - Main audit logic
- `/backend/service/agents_service.ts` - AI agent coordination
- `/backend/db/schema.ts` - Database schema
- `/src/components/fix-plan/unified-fix-plan.tsx` - Fix plan UI
