# Plan d'implémentation - Copie de liste

## Objectif
Permettre à l'utilisateur de dupliquer une liste existante avec toutes ses catégories et articles.

## Contraintes fonctionnelles

### Interface utilisateur
- **Bouton "Copier..."** : Ajouter dans la section "Gestion des Listes" de [ListSettings.svelte](../../../public/ListSettings.svelte)
- **État du bouton** : Désactivé si le champ nom de liste est vide (`id` vide ou whitespace uniquement)
- **Dialogue de confirmation** :
  - Affiche un champ texte pré-rempli avec le nom de la liste courante
  - Permet à l'utilisateur de modifier le nom de la copie
  - Propose des boutons "Copier" et "Annuler"

### Comportement de la copie
- La copie doit inclure :
  - Tous les articles de la liste (`$list`)
  - Toutes les catégories (`$categories`)
  - **IMPORTANT** : Réinitialiser la version à 0 pour la nouvelle liste
- La copie doit **exclure** :
  - L'historique partagé de synchronisation (`$sharedList`)
  - Les paramètres spécifiques (`listVersion`, etc.)

### Gestion des conflits
- Vérifier si une liste avec le nom cible existe déjà (utiliser `getList()`)
- Si le nom existe déjà : afficher une notification d'erreur
- Si le nom est valide et disponible : créer la copie

## Contraintes techniques

### Workflow de synchronisation
- **Suspension temporaire** : Utiliser `suspendBroadcasts()` avant de déconnecter
- **Déconnexion** : Déconnecter du canal de synchronisation actuel (`syncManager.disconnect()`)
- **Sauvegarde** : Persister la nouvelle liste avec `saveList(newId, { categories, list, version: 0 })`
- **Reconnexion** : Se connecter au canal de la liste source (`syncManager.connect($settings.id)`)
- **Reprise** : Utiliser `resumeBroadcasts()` après reconnexion

### Composants à modifier
1. **ListSettings.svelte** :
   - Ajouter fonction `copyList()` suivant le modèle des fonctions `createNewList()` et `loadList()`
   - Ajouter un dialogue modal pour saisir le nom de la copie
   - Ajouter le bouton "Copier..." dans la section "Gestion des Listes"

### Notifications
- **Succès** : "Liste \"{nom}\" copiée vers \"{nouveau_nom}\""
- **Erreur - nom vide** : "Veuillez entrer un nom pour la copie"
- **Erreur - existe déjà** : "Une liste avec le nom \"{nom}\" existe déjà"
- **Erreur - technique** : "Erreur lors de la copie de la liste: {message}"

### Génération des IDs d'articles
- Les articles de la nouvelle liste doivent avoir des **nouveaux IDs uniques**
- Utiliser la même logique que pour la création d'articles (basée sur timestamp ou compteur)
- Maintenir l'ordre des articles

## Étapes de réalisation

1. **Ajouter le dialogue de copie** : Créer un composant ou utiliser une fenêtre de dialogue Material UI
2. **Implémenter la fonction `copyList()`** dans ListSettings.svelte
3. **Ajouter le bouton** dans l'UI avec gestion de l'état désactivé
4. **Tester les cas limites** :
   - Nom vide
   - Nom existant
   - Liste vide
   - Liste avec beaucoup d'articles

## Notes techniques
- **Réutilisation du code** : La fonction `copyList()` suit le même pattern que `createNewList()` et `loadList()`
- **Pas de changement de contexte** : Après la copie, l'utilisateur reste sur la liste source
- **Intégrité des données** : Assurer que la copie est une deep copy des articles et catégories
