# Testing Skill

This skill helps Copilot understand the testing patterns and practices in this project.

## Test Framework

- **Framework**: Bun test (built-in)
- **Location**: `/backend/tests/`
- **Run**: `bun test`

## Test Files

### Existing Tests

- `agents_service.spec.ts` - Agent coordination tests
- `audit_service.spec.ts` - Audit logic tests

## Test Patterns

### Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('ServiceName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', async () => {
    // Arrange
    const input = {...};

    // Act
    const result = await service.method(input);

    // Assert
    expect(result).toBe(expected);
  });

  afterEach(() => {
    // Cleanup
  });
});
```

### Mocking

```typescript
import { mock } from "bun:test";

const mockApi = mock(() => Promise.resolve(data));
```

### Testing AI Services

```typescript
// Mock AI responses
const mockAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify(expectedResult),
      },
    },
  ],
};
```

### Testing Database Operations

```typescript
// Use test database
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";

// Cleanup after tests
afterEach(async () => {
  await db.delete(analyses);
});
```

## Test Coverage Areas

### Backend Services

- Audit service logic
- AI agent coordination
- GitHub API integration
- Database operations
- Fix plan generation

### Frontend Components

- Component rendering
- User interactions
- State updates
- API calls
- Error handling

## Running Tests

```bash
# Run all tests
bun test

# Run specific file
bun test backend/tests/audit_service.spec.ts

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

## Best Practices

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test service interactions
3. **Mock External APIs**: Don't call real APIs in tests
4. **Clean Database**: Reset database state between tests
5. **Test Edge Cases**: Test error conditions and edge cases
6. **Async Handling**: Always await async operations
7. **Descriptive Names**: Use clear test descriptions

## Common Assertions

```typescript
// Equality
expect(result).toBe(expected);
expect(result).toEqual(expected); // Deep equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(obj).toHaveProperty("key", value);

// Errors
expect(() => fn()).toThrow();
expect(async () => await fn()).toThrow(Error);

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

## Testing React Components (Future)

When adding frontend tests:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

it('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```
