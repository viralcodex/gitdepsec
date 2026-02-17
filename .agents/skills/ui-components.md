# UI Components Skill

This skill helps Copilot understand the UI architecture and component patterns used in this Next.js application.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Visualization**: Cytoscape.js (dependency graphs)
- **Icons**: Lucide React
- **Forms**: React Hook Form

## Component Structure

### Layout Components

- `/src/app/layout.tsx` - Root layout with providers
- `/src/components/header.tsx` - Main navigation
- `/src/components/footer.tsx` - Footer
- `/src/components/main-content.tsx` - Main content wrapper

### Feature Components

#### Dependency Visualization

- **dependency-diagram.tsx**: Interactive graph using Cytoscape
- **diagram-controls.tsx**: Zoom, reset, layout controls
- **diagram-progress.tsx**: Loading states
- **legend.tsx**: Graph legend

#### Dependency Details

- **dependency-list.tsx**: Tabular view of dependencies
- **dependency-sidebar/**: Detailed dependency information panel
  - `dependency-details.tsx`
  - `dependency-header.tsx`
  - `dependency-metadata.tsx`

#### Fix Plans

- **fix-plan/unified-fix-plan.tsx**: Main fix plan component
- **fix-plan/components/**: Sub-components for fix plan sections

### UI Primitives (shadcn/ui)

Located in `/src/components/ui/`:

- `button.tsx`, `card.tsx`, `dialog.tsx`
- `input.tsx`, `select.tsx`, `tabs.tsx`
- `badge.tsx`, `tooltip.tsx`, `skeleton.tsx`

## Styling Patterns

### Tailwind Classes

```tsx
// Responsive
className = "flex flex-col md:flex-row";

// Dark mode
className = "bg-white dark:bg-gray-900";

// Custom utilities
className = "text-primary hover:text-primary/80";
```

### Theme System

- Uses CSS variables for colors
- Dark/light mode toggle
- Defined in `/src/app/globals.css`

## State Management

### Zustand Store

```typescript
import { useAppStore } from "@/store";

// In component
const { dependencies, setDependencies } = useAppStore();
```

### Store Slices

- `/src/store/slices.ts` - Feature-specific slices
- `/src/store/app-store.ts` - Main store configuration

## Custom Hooks

- `useGraph.ts` - Cytoscape graph management
- `useRepoData.ts` - Repository data fetching
- `useFixPlanGeneration.ts` - Fix plan generation
- `useMobile.ts` - Mobile detection
- `useNetworkStatus.ts` - Network connectivity

## Routing

App Router structure:

```
/src/app/
  page.tsx - Home/search
  [username]/
    [repo]/
      page.tsx - Analysis results
```

## API Integration

```typescript
import { api } from "@/lib/api";

const result = await api.analyzeRepository(repoUrl);
```

## Component Patterns

### Loading States

```tsx
{
  isLoading ? <Skeleton /> : <Content />;
}
```

### Error Handling

```tsx
{
  error && <ErrorBadge message={error} />;
}
```

### Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Collapsible sidebar on mobile
