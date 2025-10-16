# PR Linking
The way to link PRs to an issue is via changing the root comment in a PR to reference the issue number. i.e.:

| Method | API | Auto-closes? | UI-equivalent sidebar link? |
|--------|-----|--------------|----------------------------|
| Fixes #123 in PR body | REST | ✅ Yes | ✅ Appears under "Linked issues" |
| "Link issue" via sidebar | GraphQL (internal) | ❌ No | ✅ Appears under "Linked issues" |
| Add comment with #123 | REST | ❌ No | ✅ Appears in timeline only |
| Add assignee via /assignees | REST | ❌ No | ❌ Only changes assignees |

# Optimistic updates

This codebase uses an **optimistic update pattern** for all GitHub API operations. This pattern ensures instant UI feedback despite GitHub's API indexing delays (2-5+ seconds for GraphQL changes).

## The Core Problem

GitHub's APIs have significant delays:
- **REST API**: Immediate for reads, but writes may not be reflected in subsequent reads
- **GraphQL API**: Has indexing delays for derived data (e.g., `closedByPullRequestsReferences`)
- **Result**: If you update GitHub and immediately refetch, you get stale data

❌ **Anti-pattern**: Update GitHub → Wait for API → Update UI (causes flickering)
✅ **Solution**: Update GitHub → Update UI from local cache → Eventually sync with GitHub

## The Four-Step Pattern

### Step 1: Set Loading State on the Object

```typescript
const key = buildObjectKey(params); // e.g., `${owner}/${repo}#${number}`
const object = get().objects.get(key);

// Set loading flag on the object itself, not a separate variable
set((state) => {
  const newObjects = new Map(state.objects);
  newObjects.set(key, { ...object, isPerformingOperation: true });
  return { objects: newObjects };
});
```

**Key principles:**
- Loading state lives ON the object (`object.isPerformingOperation`)
- NOT in separate variables (`const [isLoading, setIsLoading]`)
- Prevents race conditions when operating on multiple objects

### Step 2: Make the API Call

```typescript
try {
  const api = new GitHubAPI(token);
  await api.performOperation(params);
  console.log('✅ API operation successful');
```

**Key principles:**
- Use try/catch for error handling
- Log success for debugging
- Don't await subsequent updates (let them happen in background)

### Step 3: Update Store from Local Cache (Not GitHub)

```typescript
  // Build new state from YOUR stores, not from GitHub API response
  const relatedStore = useRelatedStore.getState();
  const newData = buildFromLocalCache(relatedStore, params);

  // Update object with new data + clear loading flag
  set((state) => {
    const newObjects = new Map(state.objects);
    const currentObject = newObjects.get(key);
    if (currentObject) {
      newObjects.set(key, {
        ...currentObject,
        data: newData,                    // Updated data from local cache
        isPerformingOperation: false,     // Clear loading flag
      });
    }
    return { objects: newObjects };
  });
```

**Key principles:**
- Build new state from **your local stores**, not from GitHub API
- Your stores are the source of truth (they're already up-to-date)
- Clear the loading flag in the same update

### Step 4: Error Handling - Revert Loading Only

```typescript
} catch (error) {
  console.error('❌ Operation failed:', error);
  
  // Only revert the loading flag, don't change data
  set((state) => {
    const newObjects = new Map(state.objects);
    const currentObject = newObjects.get(key);
    if (currentObject) {
      newObjects.set(key, { 
        ...currentObject, 
        isPerformingOperation: false 
      });
    }
    return { objects: newObjects };
  });
  
  throw error; // Re-throw for caller to handle
}
```

**Key principles:**
- Only revert the loading flag
- Don't change the data (user sees what they tried to do)
- Re-throw error for upstream handling

## Critical Implementation Details

### 1. Loading State on Objects, Not Separately

```typescript
// ❌ BAD: Separate loading state
const [isUpdating, setIsUpdating] = useState(false);
// Problem: Doesn't scale, race conditions with multiple operations

// ✅ GOOD: Loading state on object
interface MyObject {
  id: number;
  data: string;
  isPerformingOperation?: boolean;  // Per-object loading flag
}
```

### 2. Check for `undefined`, Not Truthiness

```typescript
// ❌ BAD: Empty arrays are falsy
const data = object.data?.length ? object.data : fallback;
// Problem: [] is falsy, triggers fallback incorrectly

// ✅ GOOD: Check if property exists
const data = object.data !== undefined ? object.data : fallback;
// Works correctly: undefined → fallback, [] → use it
```

### 3. Preserve State in Updates

When updating objects, preserve loading flags and optional data:

```typescript
const updatedObject = {
  ...newObject,
  // Preserve optional fields if not explicitly provided
  optionalData: newObject.optionalData ?? existingObject?.optionalData ?? [],
  isPerformingOperation: newObject.isPerformingOperation ?? existingObject?.isPerformingOperation ?? false,
};
```

### 4. Close Modals Immediately

```typescript
// In the component that opens the modal:
const handleUpdate = async (params) => {
  // Close modal FIRST (optimistic)
  handleCloseModal();
  
  // Then perform operation in background
  try {
    await performOperation(params);
  } catch (error) {
    // Show toast/notification, don't reopen modal
    console.error('Operation failed:', error);
  }
};
```

### 5. UI Shows Loading State

```tsx
// In the component rendering the object:
<button
  onClick={handleAction}
  disabled={object.isPerformingOperation}
  className={object.isPerformingOperation ? "cursor-wait opacity-50" : "cursor-pointer"}
>
  {object.isPerformingOperation ? (
    <>
      <Spinner />
      <span>Updating...</span>
    </>
  ) : (
    <>
      <Icon />
      <span>Action</span>
    </>
  )}
</button>
```

## Real-World Example

### ❌ Wrong Way (Causes Flickering)

```typescript
async updateSomething(id: number, newValue: string) {
  // Update GitHub
  await api.updateThing(id, newValue);
  
  // Fetch fresh data from GitHub
  const updated = await api.getThing(id);
  
  // Update UI
  set({ thing: updated });
  // Problem: GitHub hasn't indexed yet, returns stale data!
}
```

### ✅ Right Way (Optimistic)

```typescript
async updateSomething(id: number, newValue: string) {
  const key = `thing-${id}`;
  const thing = get().things.get(key);
  
  // 1. Loading state
  set((state) => {
    const newThings = new Map(state.things);
    newThings.set(key, { ...thing, isUpdating: true });
    return { things: newThings };
  });

  try {
    // 2. API call
    await api.updateThing(id, newValue);
    
    // 3. Update from local state (optimistic)
    set((state) => {
      const newThings = new Map(state.things);
      const current = newThings.get(key);
      if (current) {
        newThings.set(key, {
          ...current,
          value: newValue,      // We know what we just set
          isUpdating: false,
        });
      }
      return { things: newThings };
    });
    
  } catch (error) {
    // 4. Revert loading only
    set((state) => {
      const newThings = new Map(state.things);
      const current = newThings.get(key);
      if (current) {
        newThings.set(key, { ...current, isUpdating: false });
      }
      return { things: newThings };
    });
    throw error;
  }
}
```

## When to Use This Pattern

✅ **Use for**:
- Any mutation that updates GitHub (create, update, delete, link, unlink)
- Operations with derived data (e.g., closing keywords in PR bodies)
- Any operation where GitHub's API has indexing delays

❌ **Don't use for**:
- Initial data fetches (just fetch normally)
- Operations where you need GitHub's computed response (e.g., merge conflicts)
- Read-only operations

## Debugging Checklist

If you see flickering or old data appearing after updates:

1. ✅ Are you using the 4-step pattern?
2. ✅ Are you building new state from local cache, not GitHub API?
3. ✅ Are loading flags on objects themselves, not separate state?
4. ✅ Are you checking `!== undefined` instead of truthiness?
5. ✅ Are you preserving optional fields in `updateObject`?
6. ✅ Does your enrichment logic prefer explicit state over parsed data?

## Examples in Codebase

Reference implementations:
- `src/renderer/views/PRDetailView.tsx` - `handleToggleDraft` (draft toggle)
- `src/renderer/stores/issueStore.ts` - `linkPRsToIssue` (linking PRs to issues)
- `src/renderer/stores/issueStore.ts` - `unlinkPRFromIssue` (unlinking PRs)

## Summary

**The Pattern**:
1. Set loading flag on object
2. Call GitHub API  
3. Update object from local cache + clear loading
4. On error: just clear loading

**The Result**:
- ✅ Instant UI feedback
- ✅ No flickering
- ✅ Reliable updates
- ✅ Good UX

**The Key Insight**:
Your local stores are more up-to-date than GitHub's API responses. Trust your cache, not GitHub's delayed indexing.