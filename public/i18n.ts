// Internationalization support

export type Locale = 'en' | 'fr';

const translations = {
    en: {
        // Category notifications
        'category.added': 'Category "{name}" added',
        'category.removed': 'Category "{name}" removed',
        'category.renamed': 'Category renamed: "{oldName}" → "{newName}"',
        'category.colorChanged': 'Category "{name}" changed color',
        'category.movedUp': 'Category "{name}" moved up {count} position{plural}',
        'category.movedDown': 'Category "{name}" moved down {count} position{plural}',
        
        // List item notifications
        'item.added': 'Item "{name}" added',
        'item.removed': 'Item "{name}" removed',
        'item.renamed': 'Item renamed: "{oldName}" → "{newName}"',
        'item.moved': 'Item "{name}" moved from "{oldCategory}" to "{newCategory}"',
        'item.done': 'Item "{name}" marked as done',
        'item.notDone': 'Item "{name}" marked as not done',
    },
    fr: {
        // Notifications de catégories
        'category.added': 'Catégorie "{name}" ajoutée',
        'category.removed': 'Catégorie "{name}" supprimée',
        'category.renamed': 'Catégorie renommée : "{oldName}" → "{newName}"',
        'category.colorChanged': 'Catégorie "{name}" a changé de couleur',
        'category.movedUp': 'Catégorie "{name}" déplacée vers le haut de {count} position{plural}',
        'category.movedDown': 'Catégorie "{name}" déplacée vers le bas de {count} position{plural}',
        
        // Notifications d'éléments de liste
        'item.added': 'Élément "{name}" ajouté',
        'item.removed': 'Élément "{name}" supprimé',
        'item.renamed': 'Élément renommé : "{oldName}" → "{newName}"',
        'item.moved': 'Élément "{name}" déplacé de "{oldCategory}" vers "{newCategory}"',
        'item.done': 'Élément "{name}" marqué comme terminé',
        'item.notDone': 'Élément "{name}" marqué comme non terminé',
    }
};

// Get browser locale
function getBrowserLocale(): Locale {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('fr')) {
        return 'fr';
    }
    return 'en';
}

// Current locale (can be changed)
let currentLocale: Locale = getBrowserLocale();

// Set locale
export function setLocale(locale: Locale) {
    currentLocale = locale;
}

// Get current locale
export function getLocale(): Locale {
    return currentLocale;
}

// Translate a key with parameters
export function t(key: string, params?: Record<string, string | number>): string {
    const localeTranslations = translations[currentLocale] as Record<string, string>;
    let text = localeTranslations[key] || key;
    
    if (params) {
        // Replace placeholders like {name}, {count}, etc.
        for (const [paramKey, paramValue] of Object.entries(params)) {
            const placeholder = `{${paramKey}}`;
            text = text.replace(placeholder, String(paramValue));
        }
        
        // Handle plural forms
        if (params.count !== undefined) {
            const count = Number(params.count);
            if (currentLocale === 'fr') {
                // French: plural if count > 1
                text = text.replace('{plural}', count > 1 ? 's' : '');
            } else {
                // English: plural if count !== 1
                text = text.replace('{plural}', count !== 1 ? 's' : '');
            }
        }
    }
    
    return text;
}

// Export translations for testing or extension
export { translations };
