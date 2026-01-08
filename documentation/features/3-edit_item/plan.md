# Edit Item Feature - Implementation Plan

## Functional Requirements
- Allow users to modify an item's label
- Add "Modifier" menu item to existing item context menu
- Open dialog with text field pre-populated with current label
- Provide "OK" and "Annuler" buttons
- **Scope constraint**: Feature only available in Edit mode (not Shop, not Inbox)

## Technical Approach

### Architecture Pattern
Follow existing dialog pattern used for Delete and Move features:
- Use SMUI Dialog component
- State management with boolean flag and item reference
- Handler functions for open/close actions
- Integration with existing menu system

### Key Components
1. **Edit Dialog** - SMUI Dialog with Textfield for label editing
2. **Menu Item** - "Modifier" entry in item dropdown menu
3. **State Management** - Track dialog state and item being edited
4. **Update Handler** - Modify item in store and trigger sync

### Technical Constraints

#### Visibility Constraint
- Menu item must only appear when `mode === ListMode.Edit`
- Must not appear in Shop or Inbox modes

#### Data Validation
- Empty labels not allowed - validate before save
- Trim whitespace from input

#### Store Interaction
- Update must write to `$list` store
- Must trigger `save()` for sync/persistence
- Must refresh UI state (`updateItemsByCategory()`, `updateSuggestions()`)

#### UI Consistency
- Use French labels ("Modifier", "Annuler", "OK")
- Follow SMUI component patterns used elsewhere
- Maintain consistent styling with other dialogs

### Dependencies
- SMUI Textfield component (requires import)
- Existing menu infrastructure
- Store update mechanisms

## Files to Modify
- [public/List.svelte](c:/Users/olduh/dev/liste/public/List.svelte) - All implementation in single file
