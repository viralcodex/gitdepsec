# Database Schema Skill

This skill helps Copilot understand the database structure and ORM usage in this project.

## ORM Setup

- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Location**: `/backend/db/`

## Schema Files

### Main Schema

`/backend/db/schema.ts` - Defines all database tables

### Database Client

`/backend/db/db.ts` - Database connection and client setup

### Actions

`/backend/db/actions.ts` - Common database operations

## Table Structure

### Core Tables

#### analyses

Stores audit history for repositories

```typescript
{
  id: uuid (primary key)
  repoUrl: text
  username: text
  repoName: text
  status: text (pending, processing, completed, failed)
  result: json
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### fix_plans

Stores AI-generated fix plans

```typescript
{
  id: uuid (primary key)
  analysisId: uuid (foreign key to analyses)
  plan: json
  status: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### users

User information

```typescript
{
  id: uuid (primary key)
  email: text
  name: text
  apiKey: text (encrypted)
  createdAt: timestamp
}
```

## Query Patterns

### Insert

```typescript
await db.insert(analyses).values({
  repoUrl,
  username,
  repoName,
  status: "pending",
});
```

### Query

```typescript
const analysis = await db.query.analyses.findFirst({
  where: eq(analyses.id, analysisId),
  with: {
    fixPlans: true,
  },
});
```

### Update

```typescript
await db.update(analyses).set({ status: "completed", result }).where(eq(analyses.id, analysisId));
```

### Delete

```typescript
await db.delete(analyses).where(eq(analyses.id, analysisId));
```

## Migrations

- Located in `/backend/drizzle/`
- Run with: `bun run db:migrate`
- Generate with: `bun run db:generate`

## Environment Variables

Required in `.env`:

```
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## Common Operations

### Create Audit Record

```typescript
const analysis = await createAnalysis({
  repoUrl,
  username,
  repoName,
});
```

### Save Fix Plan

```typescript
await saveFixPlan({
  analysisId,
  plan: fixPlanData,
});
```

### Get Audit History

```typescript
const history = await getAnalysisHistory(userId, limit);
```

## Relations

```
users → analyses (one-to-many)
analyses → fix_plans (one-to-many)
```

## JSON Fields

Complex data stored as JSON:

- `audits.result` - Full audit results
- `fix_plans.plan` - Structured fix plan data

Access with JSON operators:

```typescript
where: sql`${audits.result}->>'status' = 'vulnerable'`;
```
