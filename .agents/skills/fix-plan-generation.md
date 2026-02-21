# Fix Plan Generation Skill

This skill guides Copilot on how the AI-powered fix plan generation works in this project.

## Overview

The fix plan system uses multiple AI agents to analyze vulnerabilities and generate actionable remediation plans.

## Architecture

### Agent Types

1. **Coordinator Agent**: Orchestrates multiple specialized agents
2. **Audit Agent**: Analyzes vulnerabilities and dependencies
3. **Remediation Agent**: Generates specific fix steps
4. **Validation Agent**: Validates proposed fixes

### Flow

```
User Request → Analysis Service → Agents Service → AI Service → Fix Plan
                                      ↓
                              Multiple AI Agents
                                      ↓
                              Structured Response
```

## Key Files

### Backend

- `/backend/service/agents_service.ts` - Main agent coordination
- `/backend/service/ai_service.ts` - LLM API calls
- `/backend/prompts/prompts.ts` - System prompts for agents
- `/backend/prompts/schemas/*.json` - JSON schemas for responses

### Frontend

- `/src/components/fix-plan/unified-fix-plan.tsx` - Main fix plan UI
- `/src/components/fix-plan/components/` - Fix plan sub-components
- `/src/hooks/useFixPlanGeneration.ts` - Fix plan generation hook

## Response Schemas

Fix plans use structured JSON schemas:

- **batch_fix_plan_schema.json**: Multiple vulnerability fixes
- **global_fix_plan_response_schema.json**: Complete fix plan structure
- **smart_actions_schema.json**: Smart action recommendations

## AI Integration

### Supported Providers

- OpenAI (GPT-4, GPT-4-turbo)
- OpenRouter (various models)

### Prompt Engineering

- System prompts define agent roles
- Schemas enforce structured outputs
- Context includes dependency graph, CVE data, and package info

## State Management

Fix plans are stored in Zustand store:

```typescript
interface AppState {
  fixPlan: FixPlan | null;
  isGeneratingFixPlan: boolean;
  fixPlanError: string | null;
}
```

## API Endpoints

- `POST /api/analyze/fix-plan` - Generate new fix plan
- `GET /api/fix-plans/:id` - Retrieve existing fix plan
- `POST /api/fix-plans/:id/validate` - Validate fix plan
