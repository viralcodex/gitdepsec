# UI Component Architecture

## Component Hierarchy

```
FixPlanCard (Main Container)
├── Header
│   ├── AI Icon + Title
│   └── Controls (Expand/Collapse, Regenerate, Download, Close)
├── CardContent
│   ├── FixPlanProgress (NEW - Shows during loading)
│   │   ├── Progress Bar (0-100%)
│   │   ├── Phase Indicators (5 phases with icons)
│   │   ├── Current Step Display
│   │   └── Phase Description
│   └── Tabs
│       ├── Individual Fix Plans Tab
│       │   └── IndividualFixPlan Component (existing)
│       └── Global Fix Plan Tab
│           └── GlobalFixPlan Component (enhanced)
│               ├── Architecture Detection (NEW)
│               │   ├── Check for unified fields
│               │   └── Route to appropriate component
│               ├── UnifiedFixPlanComponent (NEW)
│               │   ├── Overview Tab
│               │   │   ├── Key Metrics Grid (4 metrics)
│               │   │   ├── Critical Insights List
│               │   │   └── Quick Wins Cards
│               │   ├── Phases Tab
│               │   │   └── CollapsibleSection[] (per phase)
│               │   │       ├── Phase Details
│               │   │       ├── Dependencies
│               │   │       ├── Fixes List
│               │   │       ├── Batch Commands
│               │   │       ├── Validation Steps
│               │   │       └── Rollback Plan
│               │   ├── Intelligence Tab
│               │   │   ├── Critical Paths
│               │   │   ├── Shared Transitive Vulns
│               │   │   ├── Version Conflicts
│               │   │   └── Optimizations
│               │   ├── Automation Tab
│               │   │   ├── One-Click Script
│               │   │   ├── Safe Mode Script
│               │   │   └── Phase Scripts[]
│               │   └── Risk & Strategy Tab
│               │       ├── Overall Assessment
│               │       ├── Breaking Changes
│               │       ├── Testing Strategy
│               │       ├── Rollback Procedures
│               │       └── Long-term Strategy
│               └── Legacy Component (existing)
│                   ├── Global Analysis Tab
│                   ├── Optimization Tab
│                   └── Conflict Resolution Tab
└── Footer
    └── AI Disclaimer
```

## Data Flow

```
Backend (agents_service_new.ts)
    │
    ├─ generateGlobalFixPlan()
    │       │
    │       ├─ Phase 1: Preprocessing
    │       ├─ Phase 2: Parallel Intelligence
    │       ├─ Phase 3: Batch Processing
    │       ├─ Phase 4: Synthesis
    │       └─ Phase 5: Enrichment
    │
    ↓ SSE Stream
    │
Server (server.ts)
    │
    ├─ /fixPlan endpoint
    │       │
    │       └─ progressCallback()
    │               │
    │               └─ Emits: { step, progress, data }
    │
    ↓ SSE Events
    │
Frontend Hook (useFixPlanGeneration.ts)
    │
    ├─ onGlobalFixPlanMessage()
    │       │
    │       └─ setGlobalFixPlan(json_string)
    │
    ↓ Zustand Store
    │
Store (app-store.ts)
    │
    └─ globalFixPlan: string
            │
            ↓
GlobalFixPlan Component
    │
    ├─ useMemo: Parse JSON
    ├─ useMemo: Detect Architecture
    │       │
    │       ├─ Has executive_summary/priority_phases?
    │       │       │
    │       │       ├─ YES → UnifiedFixPlanComponent
    │       │       └─ NO  → Legacy Component
    │       │
    │       └─ Render appropriate UI
    │
    ↓
User Interface
```

## Architecture Detection Logic

```typescript
// Automatic detection in GlobalFixPlan component
const isUnifiedArchitecture = useMemo(() => {
  if (!globalFixPlan) return false;
  
  try {
    const parsed = JSON.parse(globalFixPlan);
    
    // Check for NEW architecture fields
    return !!(
      parsed.executive_summary || 
      parsed.priority_phases || 
      parsed.automated_execution
    );
  } catch {
    return false;
  }
}, [globalFixPlan]);

// Conditional rendering
if (isUnifiedArchitecture) {
  return <UnifiedFixPlanComponent />;  // NEW
}
return <LegacyComponent />;  // EXISTING
```

## Performance Strategy

### Lazy Rendering
```typescript
// CollapsibleSection only renders when open
const [isOpen, setIsOpen] = useState(defaultOpen);

return (
  <div>
    <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
    {isOpen && <ExpensiveContent />}  {/* Only renders when needed */}
  </div>
);
```

### Memoization
```typescript
// Parse once, use everywhere
const parsedPlan = useMemo(() => {
  return typeof fixPlan === "string" 
    ? JSON.parse(fixPlan) 
    : fixPlan;
}, [fixPlan]);  // Only re-parse if fixPlan changes
```

### Progressive Loading
```typescript
// Show skeleton immediately
{isLoading ? (
  <SectionSkeleton lines={5} />  // Instant feedback
) : (
  <ActualContent />  // Rendered when ready
)}
```

## State Management

### Zustand Store Structure
```typescript
interface FixPlanState {
  // Existing (preserved)
  fixPlan: Record<string, string>;
  globalFixPlan: string;  // Used for BOTH architectures
  fixOptimizationPlan: string;
  conflictResolutionPlan: string;
  strategyPlan: string;
  isFixPlanLoading: boolean;
  isFixPlanGenerated: boolean;
  
  // Actions
  setGlobalFixPlan: (plan: string) => void;
  setIsFixPlanLoading: (loading: boolean) => void;
  // ... other actions
}
```

### Why String Storage?
✅ **Backward compatible** - Works with both old and new
✅ **SSE friendly** - Direct from server stream
✅ **Type flexible** - Component handles parsing
✅ **Store agnostic** - No store changes needed

## UI Responsiveness

### Grid System
```typescript
// Adaptive columns based on screen size
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  {/* 2 columns on mobile, 4 on desktop */}
</div>
```

### Scrolling Strategy
```typescript
// Nested scrolling for large content
<CardContent className="h-full overflow-y-scroll">
  <TabsContent className="overflow-y-auto">
    {/* Inner content scrolls independently */}
  </TabsContent>
</CardContent>
```

## Icon System

### Phase Icons
| Phase | Icon | Color |
|-------|------|-------|
| Preprocessing | Package | Blue |
| Parallel Intelligence | Brain | Purple |
| Batch Processing | Zap | Yellow |
| Synthesis | Sparkles | Pink |
| Enrichment | Shield | Green |

### Status Icons
| Status | Icon | Usage |
|--------|------|-------|
| Completed | CheckCircle | ✅ Done |
| Active | PulsingIcon | 🔄 In Progress |
| Pending | MutedIcon | ⏸️ Waiting |
| Error | AlertTriangle | ⚠️ Warning |

## Loading States

### Progress Indicator Phases
```
[0-20%]   Preprocessing
[20-40%]  Parallel Intelligence  
[40-60%]  Batch Processing
[60-80%]  Synthesis
[80-100%] Enrichment
```

### Visual Feedback
1. **Progress Bar** - Fills left to right
2. **Phase Icons** - Light up sequentially
3. **Current Step** - Shows text with animated dots
4. **Phase Description** - Context for current work

## Code Highlighting

### Parsing Strategy
```typescript
const parseCodeString = (str?: string) => {
  // Split on <code>...</code> tags
  const parts = str.split(/(<code>.*?<\/code>)/g);
  
  return parts.map(part => {
    if (part.match(/^<code>.*<\/code>$/)) {
      // Extract and style code
      return <code className="...">{codeText}</code>;
    }
    return <span>{part}</span>;
  });
};
```

### Styling
- **Inline code**: `bg-accent-foreground px-1.5 py-0.5 rounded`
- **Code blocks**: `bg-accent-foreground p-3 rounded overflow-x-auto font-mono`
- **Commands**: Highlighted with special background

## Migration Timeline

```
Day 1: Deploy New UI
    ├─ Backend still uses old structure
    ├─ UI detects old structure
    └─ Renders legacy component
    ✅ Zero impact on users

Day 2: Deploy New Backend
    ├─ Backend generates unified structure
    ├─ UI detects unified structure
    └─ Renders new component
    ✅ Users see enhanced features

Day 3+: Monitor & Optimize
    ├─ Collect performance metrics
    ├─ User feedback
    └─ Iterative improvements
    ✅ Continuous enhancement
```

## Component Reusability

### Shared Components
- `CollapsibleSection` - Used in Intelligence, Automation, Risk tabs
- `CodeBlock` - Used for all script displays
- `SectionSkeleton` - Used across all tabs
- `parseCodeString` - Used for all text with code tags

### Benefits
✅ **DRY principle** - Write once, use everywhere
✅ **Consistent UX** - Same behavior across tabs
✅ **Easy maintenance** - Single source of truth
✅ **Performance** - Shared logic is optimized

## Summary

The new UI architecture provides:
- ✅ **Seamless backward compatibility**
- ✅ **Performance-optimized rendering**
- ✅ **Rich feature visualization**
- ✅ **Responsive design**
- ✅ **Production-ready implementation**
