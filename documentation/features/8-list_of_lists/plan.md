# Plan d'implémentation - Liste de listes (List of Lists)

## Objectif
Permettre à l'utilisateur d'accéder facilement à toutes les listes qu'il a déjà utilisées via un système d'autocomplétion, avec persistance en localStorage.

## Contraintes fonctionnelles

### Interface utilisateur
- **Remplacement du Textfield par Autocomplete** dans la section "Gestion des Listes" de [ListSettings.svelte](../../../public/ListSettings.svelte)
- **Autocomplétion** : L'utilisateur doit voir les suggestions de listes déjà utilisées pendant la frappe
- **Sélection** : Cliquer sur une suggestion doit charger automatiquement cette liste
- **Nouveau nom** : L'utilisateur peut toujours taper un nouveau nom de liste

### Gestion de l'historique des listes
- **Stockage en localStorage** : Maintenir une liste de toutes les listes utilisées
- **Structure de données** :
  ```typescript
  interface ListMetadata {
    id: string;           // Nom de la liste
    lastAccessed: number; // Timestamp du dernier accès
    version: number;      // Version de la liste
  }
  ```
- **Tri** : Les listes doivent être triées par ordre d'accès récent (plus récent en premier)
- **Mise à jour automatique** : L'historique doit être mis à jour lors de :
  - Création d'une nouvelle liste
  - Chargement d'une liste existante
  - Copie d'une liste
  - Sauvegarde d'une liste

### Cohérence des données
- **Sauvegarde atomique** : Lors de la sauvegarde, catégories et liste doivent toujours être sauvegardées ensemble
- **Version tracking** : Stocker la version avec chaque métadonnée de liste
- **Synchronisation** : Mettre à jour la version locale après chaque sauvegarde/chargement

### Mode offline
- **Édition offline** : L'utilisateur peut créer, modifier et copier des listes même sans connexion réseau
- **Historique local** : L'historique des listes doit être maintenu uniquement en localStorage, indépendamment du serveur
- **Persistance locale** : Les listes, catégories et versions doivent être sauvegardées localement même en cas d'échec de connexion au serveur
- **Suggestions disponibles** : L'autocomplete doit fonctionner avec l'historique local même offline
- **Gestion d'erreur** : En cas d'échec de communication serveur, continuer le fonctionnement en mode dégradé avec localStorage uniquement
- **Synchronisation différée** : Les modifications locales seront synchronisées avec le serveur quand la connexion sera rétablie (via le syncManager existant)

## Contraintes techniques

### Nouveau store pour l'historique
Créer un nouveau store dans [store.ts](../../../public/store.ts) :
```typescript
export const listsHistory = createWritableStore<ListMetadata[]>('listsHistory', []);
```

### Modifications dans ListSettings.svelte

#### 1. Import Autocomplete
```typescript
import Autocomplete from '@smui-extra/autocomplete';
```

#### 2. Variables d'état
```typescript
let listSuggestions: string[] = [];
```

#### 3. Fonctions de gestion de l'historique

**`updateListHistory(listId: string, version: number)`**
- Ajoute ou met à jour une entrée dans l'historique
- Si la liste existe déjà : mettre à jour `lastAccessed` et `version`
- Si nouvelle liste : créer une nouvelle entrée
- Trier par `lastAccessed` décroissant
- Persister dans localStorage

**`loadSuggestionsFromHistory()`**
- Charger l'historique depuis le store
- Extraire les IDs de listes
- Trier par date d'accès (plus récent en premier)
- Mettre à jour `listSuggestions`

**`onListSelected(selectedId: string)`**
- Appelée quand l'utilisateur sélectionne une liste dans l'autocomplete
- Doit charger automatiquement la liste via `loadList()`
- Mettre à jour l'historique

#### 4. Points d'intégration
Appeler `updateListHistory()` dans :
- `createNewList()` - après création réussie
- `loadList()` - après chargement réussi
- `copyList()` - après copie réussie
- `save()` - après sauvegarde réussie

#### 5. Remplacement du Textfield
```svelte
<Autocomplete 
    bind:value={id} 
    label="Nom de la liste" 
    options={listSuggestions}
    on:SMUI:selected={onListSelected}
    combobox
    style="width: 100%;"
/>
```

### Gestion du lifecycle
- **onMount** : Charger les suggestions depuis l'historique
- **Réactivité** : Mettre à jour les suggestions quand `listsHistory` change

## Comportements spécifiques

### Autocomplete en mode combobox
- Permet de saisir un nouveau nom qui n'existe pas dans les suggestions
- Affiche les suggestions filtrées pendant la frappe
- Permet la sélection par clic ou navigation clavier

### Chargement automatique
- Quand l'utilisateur sélectionne une liste dans l'autocomplete, charger automatiquement cette liste
- Pas besoin de cliquer sur "Recharger" après sélection

### Limite de l'historique (optionnel)
- Envisager de limiter l'historique à N entrées (ex: 50 listes max)
- Supprimer les plus anciennes si dépassement

### Gestion des erreurs réseau
- **Tolérance aux erreurs** : Ne pas bloquer l'interface si `saveList()` ou `getList()` échouent
- **Fallback localStorage** : Si le serveur est inaccessible, continuer à utiliser les données locales
- **Mise à jour de l'historique** : Mettre à jour l'historique même en cas d'échec serveur (liste créée/modifiée localement)
- **Notifications informatives** : Informer l'utilisateur en cas de problème de connexion, mais permettre le travail en local

## Étapes de réalisation

1. **Créer le nouveau store** `listsHistory` dans store.ts
2. **Créer l'interface** `ListMetadata` dans model.ts
3. **Implémenter les fonctions** de gestion de l'historique dans ListSettings.svelte
4. **Remplacer Textfield par Autocomplete** dans l'UI
5. **Intégrer les appels** `updateListHistory()` dans toutes les fonctions concernées
6. **Implémenter le chargement automatique** lors de la sélection
7. **Tester les cas d'usage** :
   - Création de plusieurs listes
   - Navigation entre listes
   - Copie de liste
   - Ordre de tri des suggestions
   - Saisie d'un nouveau nom

## Notes techniques

### Utilisation d'Autocomplete
Suivre le pattern déjà utilisé dans [List.svelte](../../../public/List.svelte) :
```svelte
<Autocomplete 
    label="Ajouter..." 
    combobox 
    options={suggestions[category]} 
    bind:value={suggestionSelection[category]} 
/>
```

### Persistance automatique
Le store `listsHistory` utilisera `useLocalStorage()` pour persister automatiquement toutes les modifications.

### Tri et filtrage
- Tri par `lastAccessed` décroissant pour afficher les listes les plus récentes en premier
- L'Autocomplete gère automatiquement le filtrage pendant la frappe

## Bénéfices

- **UX améliorée** : Navigation rapide entre listes
- **Historique persistant** : Les listes utilisées sont mémorisées
- **Découvrabilité** : L'utilisateur voit facilement toutes ses listes
- **Moins d'erreurs** : Réduction des fautes de frappe grâce à l'autocomplétion
