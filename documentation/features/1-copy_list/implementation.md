# Implémentation - Copie de liste

## Modifications apportées

### Fichier modifié: ListSettings.svelte

#### 1. Imports ajoutés
```typescript
import Dialog, { Actions } from '@smui/dialog';
import type { ShopItem } from './model';
```

#### 2. Variables d'état ajoutées
```typescript
let openCopyDialog: boolean = false;
let copyListName: string = '';
```

#### 3. Fonction `openCopyListDialog()`
Ouvre le dialogue de copie après validation:
- Vérifie que `$settings.id` n'est pas vide
- Pré-remplit `copyListName` avec le nom de la liste actuelle
- Affiche une notification d'erreur si aucun nom de liste n'est défini
- Ouvre le dialogue modal

#### 4. Fonction `closeCopyDialog(e: CustomEvent)`
Gère la fermeture du dialogue:
- Si l'action est 'copy', appelle `copyList()`
- Ferme le dialogue dans tous les cas

#### 5. Fonction `copyList()` - Cœur de l'implémentation

**Workflow complet:**

1. **Validation du nom cible**
   - Vérifie que `copyListName` n'est pas vide
   - Affiche une notification d'erreur si vide

2. **Sauvegarde du contexte source**
   ```typescript
   const sourceListId = $settings.id;
   ```

3. **Déconnexion du canal de synchronisation**
   ```typescript
   suspendBroadcasts();
   syncManager.disconnect();
   ```
   - Suspend les broadcasts pour éviter les conflits
   - Déconnecte proprement du canal actuel

4. **Vérification de l'existence**
   - Utilise `getList(copyListName)` pour vérifier si la liste cible existe
   - Si elle existe: affiche une erreur et se reconnecte à la source
   - Permet d'éviter l'écrasement de données existantes

5. **Création des copies profondes**
   ```typescript
   const copiedList: ShopItem[] = $list.map((item, index) => ({
       ...item,
       id: index + 1
   }));
   const copiedCategories = JSON.parse(JSON.stringify($categories));
   ```
   - **Articles**: Copie avec régénération des IDs (1, 2, 3...)
   - **Catégories**: Deep copy via JSON pour éviter les références partagées

6. **Sauvegarde de la nouvelle liste**
   ```typescript
   await saveList(copyListName, { 
       categories: copiedCategories, 
       list: copiedList, 
       version: 0 
   });
   ```
   - Version réinitialisée à 0
   - Notifications de succès ou d'erreur selon le résultat

7. **Reconnexion à la source**
   ```typescript
   syncManager.connect(sourceListId || 'default');
   resumeBroadcasts();
   ```
   - L'utilisateur reste sur la liste source après la copie
   - Reprise normale des broadcasts de synchronisation

#### 6. Bouton UI
Ajouté dans la section "Gestion des Listes":
```svelte
<Button on:click={openCopyListDialog} variant="raised" 
        disabled={!$settings.id || $settings.id.trim() === ''}>
    <Icon class="material-icons">content_copy</Icon>
    <Label>Copier...</Label>
</Button>
```
- **État désactivé**: Lié à l'état de `$settings.id`
- **Icône**: `content_copy` de Material Icons
- **Position**: Après les boutons Créer/Sauvegarder/Recharger

#### 7. Dialogue modal
```svelte
<Dialog bind:open={openCopyDialog}
        selection
        on:SMUIDialog:closed={closeCopyDialog}>
    <Title>Copier la liste</Title>
    <Content>
        <Textfield bind:value={copyListName} 
                   label="Nom de la nouvelle liste" 
                   style="width: 100%;" />
    </Content>
    <Actions>
        <Button><Label>Annuler</Label></Button>
        <Button action="copy"><Label>Copier</Label></Button>
    </Actions>
</Dialog>
```

## Détails techniques importants

### Génération des IDs
Les IDs sont régénérés séquentiellement (1, 2, 3...) pour la nouvelle liste:
- Évite les conflits d'IDs entre listes
- Suit le pattern existant de l'application (voir `List.svelte::AddOrUpdate()`)
- Maintient l'ordre des articles

### Gestion de la synchronisation
Le workflow de déconnexion/reconnexion suit exactement le même pattern que `createNewList()` et `loadList()`:
1. `suspendBroadcasts()` - Suspend les communications
2. `syncManager.disconnect()` - Déconnexion propre
3. Opérations de copie
4. `syncManager.connect(sourceListId)` - Reconnexion à la source
5. `resumeBroadcasts()` - Reprise des communications

### Copies profondes
- **Catégories**: `JSON.parse(JSON.stringify($categories))` pour éviter toute référence partagée
- **Articles**: Spread operator + nouvelle structure avec nouveaux IDs

### Notifications
Toutes les notifications suivent le pattern existant:
```typescript
notifications.show(message, type, duration, { always: true, listId: id })
```
Note: Le 4ème paramètre est une erreur TypeScript pré-existante dans le codebase.

## Tests à effectuer

1. **Cas nominal**: Copier une liste avec articles et catégories
2. **Liste vide**: Copier une liste sans articles
3. **Nom existant**: Tenter de copier vers un nom déjà utilisé
4. **Nom vide**: Valider le champ vide dans le dialogue
5. **Annulation**: Fermer le dialogue sans copier
6. **Synchronisation**: Vérifier que la source reste connectée après copie
7. **IDs uniques**: Vérifier que les IDs sont bien régénérés

## Conformité au plan
✅ Toutes les contraintes fonctionnelles et techniques du plan ont été respectées
✅ Le code suit les patterns existants de l'application
✅ La gestion de la synchronisation est correctement implémentée
✅ Les notifications sont cohérentes avec l'existant
