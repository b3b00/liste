# goal
User should be able to create a copy of a list. 

## Copy list feature
A button "Copier..." should be available in the list management section of settings.
Button should be disabled when no list name is available in the listname text field.
When clicked, a dialog popups with a textfield pre-populated with the current list name.
User can modify the name and click "Copier" to create the copy, or "Annuler" to cancel.

## Create list feature (additional improvement)
The "Créer nouvelle liste..." button now also opens a dialog instead of using the text field directly.
The dialog shows an empty text field for the new list name.
User can enter the name and click "Créer" to create the list, or "Annuler" to cancel.
After successful creation, the main text field is updated with the new list name.

## Button states
- **Créer nouvelle liste...**: Always enabled (no list name required)
- **Sauvegarder**: Disabled when list name text field is empty
- **Recharger**: Disabled when list name text field is empty  
- **Copier...**: Disabled when list name text field is empty
