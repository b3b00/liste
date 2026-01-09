<script lang="ts">

    import { onMount } from "svelte";
    import { list, settings, categories, versionInfo, enableNotifications, sharedList, listVersion, listsHistory } from './store';
    import { notifications } from './notifications';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import { saveList, getList, getVersion } from "./client"
    import { syncManager, suspendBroadcasts, resumeBroadcasts } from './syncManager';
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';
    import Paper, { Title, Content } from '@smui/paper';
    import Dialog, { Actions } from '@smui/dialog';
    import Autocomplete from '@smui/autocomplete';
    import type { ShopItem } from './model';


    list.useLocalStorage();
    settings.useLocalStorage();
    categories.useLocalStorage();
    versionInfo.useLocalStorage();
    sharedList.useLocalStorage();
    listVersion.useLocalStorage();
    listsHistory.useLocalStorage();

     import type { VersionInfo } from "./model";


    let id = '';

    let autosave : boolean = false;
    let notifyEnabled: boolean = false;

    let openCopyDialog: boolean = false;
    let copyListName: string = '';
    
    let openCreateDialog: boolean = false;
    let createListName: string = '';

    let listSuggestions: string[] = [];


     $: console.log(`Settings changed: ${JSON.stringify($settings)}`);

    function updateListHistory(listId: string, version: number) {
        const now = Date.now();
        let history = $listsHistory;
        
        // Find existing entry
        const existingIndex = history.findIndex(item => item.id === listId);
        
        if (existingIndex !== -1) {
            // Update existing entry
            history[existingIndex] = {
                id: listId,
                lastAccessed: now,
                version: version
            };
        } else {
            // Add new entry
            history.push({
                id: listId,
                lastAccessed: now,
                version: version
            });
        }
        
        // Sort by lastAccessed (most recent first)
        history.sort((a, b) => b.lastAccessed - a.lastAccessed);
        
        // Optional: Limit history to 50 entries
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        $listsHistory = history;
        loadSuggestionsFromHistory();
    }

    function loadSuggestionsFromHistory() {
        listSuggestions = $listsHistory.map(item => item.id);
    }

    async function onListSelected() {
        if (id && id.trim() !== '' && id !== '__new__') {
            await loadList();
        }
    }

    onMount(async () => {
        id = $settings.id || '';
        autosave = $settings.autoSave;
        notifyEnabled = $enableNotifications;
        //version = await getVersion();
        $versionInfo = await getVersion() || {version:'0.0.0', hash:undefined};
        loadSuggestionsFromHistory();
    });

    async function save() {
        if ($settings.id) {
            const newVersion = ($listVersion || 0) + 1;
            try {
                await saveList($settings.id, {
                    categories: $categories,
                    list: $list,
                    version: newVersion
                });
                // Update local version after save
                $listVersion = newVersion;
                updateListHistory($settings.id, newVersion);
                notifications.show(`Liste "${$settings.id}" sauvegardée`, 'success', 3000, { always: true, listId: $settings.id });
            } catch (e) {
                // Even if server save fails, update local history for offline work
                $listVersion = newVersion;
                updateListHistory($settings.id, newVersion);
                console.warn('[ListSettings] Save to server failed, working offline', e);
            }
        }
    }

    function openCreateListDialog() {
        createListName = '';
        openCreateDialog = true;
    }

    async function closeCreateDialog(e: CustomEvent<{ action: string }>) {
        if (e.detail.action === 'create') {
            await createNewList();
        }
        openCreateDialog = false;
    }

    async function createNewList() {
        if (!createListName || createListName.trim() === '') {
            notifications.show('Veuillez entrer un nom de liste', 'error', 4000, { always: true, listId: createListName });
            return;
        }

        // Disconnect from old list channel
        try {
            suspendBroadcasts();
            if (syncManager.isConnected()) {
                syncManager.disconnect();
            }
        } catch (err) {
            console.warn('[ListSettings] Error disconnecting', err);
        }

        // Check if list already exists
        const existing = await getList(createListName);
        if (existing) {
            notifications.show(`Une liste avec le nom "${createListName}" existe déjà`, 'error', 4000, { always: true, listId: createListName });
            // Reconnect to current list
            try {
                syncManager.connect($settings.id || 'default');
                resumeBroadcasts();
            } catch (err) {
                console.warn('[ListSettings] reconnect failed', err);
            }
            return;
        }

        // Create new empty list
        $settings = {
            id: createListName,
            autoSave: autosave
        };
        $list = [];
        id = createListName;
        
        // Persist the empty list with current categories
        try {
            await saveList(createListName, { categories: $categories, list: [], version: 0 });
            $listVersion = 0;
            updateListHistory(createListName, 0);
            notifications.show(`Liste "${createListName}" créée`, 'success', 4000, { always: true, listId: createListName });
        } catch (e) {
            // Even if server save fails, update local history for offline work
            $listVersion = 0;
            updateListHistory(createListName, 0);
            console.warn('[ListSettings] Create to server failed, working offline', e);
            notifications.show(`Liste "${createListName}" créée (mode local)`, 'success', 4000, { always: true, listId: createListName });
        }

        // Connect to the new list channel
        try {
            syncManager.connect(createListName);
            resumeBroadcasts();
        } catch (err) {
            console.warn('[ListSettings] reconnect failed', err);
        }
    }

    async function loadList() {
        if (!id || id.trim() === '') {
            notifications.show('Veuillez entrer un nom de liste', 'error', 4000, { always: true, listId: id });
            return;
        }

        // Disconnect from old list channel before switching
        try {
            suspendBroadcasts();
            if (syncManager.isConnected()) {
                syncManager.disconnect();
            }
        } catch (err) {
            console.warn('[ListSettings] Error disconnecting', err);
        }

        const reloaded = await getList(id);
        if(reloaded) {
            // List exists - load it
            $settings = {
                id: id,
                autoSave: autosave
            };
            $list = reloaded.list;
            $categories = reloaded.categories;
            $listVersion = reloaded.version || 0;
            updateListHistory(id, reloaded.version || 0);
            notifications.show(`Liste "${id}" rechargée`, 'success', 3000, { always: true, listId: id });
        }
        else {
            notifications.show(`La liste "${id}" n'existe pas`, 'error', 4000, { always: true, listId: id });
        }
        
        // Reconnect to the new list channel
        try {
            syncManager.connect(id);
            resumeBroadcasts();
        } catch (err) {
            console.warn('[ListSettings] reconnect failed', err);
        }
    }


    function downloadJSON() {
        const data = {
            categories: $categories,
            list: $list
        };
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liste-${id || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        // Chrome requires a small delay for programmatic clicks
        setTimeout(() => {
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, 0);
    }

    function uploadJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (data.categories && data.list) {
                    $categories = data.categories;
                    $list = data.list;
                    window.alert('Liste importée avec succès !');
                } else {
                    window.alert('Format JSON invalide. Le fichier doit contenir "categories" et "list".');
                }
            } catch (error: any) {
                window.alert(`Erreur lors de l'import: ${error.message}`);
            }
        };
        input.click();
    }

    function openCopyListDialog() {
        if (!id || id.trim() === '') {
            notifications.show('Veuillez entrer un nom de liste', 'error', 4000, { always: true, listId: id });
            return;
        }
        copyListName = $settings.id || '';
        openCopyDialog = true;
    }

    async function closeCopyDialog(e: CustomEvent<{ action: string }>) {
        if (e.detail.action === 'copy') {
            await copyList();
        }
        openCopyDialog = false;
    }

    async function copyList() {
        if (!copyListName || copyListName.trim() === '') {
            notifications.show('Veuillez entrer un nom pour la copie', 'error', 4000, { always: true, listId: copyListName });
            return;
        }

        const sourceListId = $settings.id;

        // Disconnect from old list channel
        try {
            suspendBroadcasts();
            if (syncManager.isConnected()) {
                syncManager.disconnect();
            }
        } catch (err) {
            console.warn('[ListSettings] Error disconnecting', err);
        }

        // Check if target list already exists
        const existing = await getList(copyListName);
        if (existing) {
            notifications.show(`Une liste avec le nom "${copyListName}" existe déjà`, 'error', 4000, { always: true, listId: copyListName });
            // Reconnect to current list
            try {
                syncManager.connect(sourceListId || 'default');
                resumeBroadcasts();
            } catch (err) {
                console.warn('[ListSettings] reconnect failed', err);
            }
            return;
        }

        // Create deep copy of list items with new IDs
        const copiedList: ShopItem[] = $list.map((item, index) => ({
            ...item,
            id: index + 1
        }));

        // Create deep copy of categories
        const copiedCategories = JSON.parse(JSON.stringify($categories));

        // Save the copied list
        try {
            await saveList(copyListName, { 
                categories: copiedCategories, 
                list: copiedList, 
                version: 0 
            });
            
            // Switch to the new list
            $settings = {
                id: copyListName,
                autoSave: autosave
            };
            $list = copiedList;
            $categories = copiedCategories;
            $listVersion = 0;
            id = copyListName;
            updateListHistory(copyListName, 0);
            
            notifications.show(`Liste "${sourceListId}" copiée vers "${copyListName}"`, 'success', 4000, { always: true, listId: copyListName });
        } catch (e) {
            // Even if server save fails, update local history for offline work
            $settings = {
                id: copyListName,
                autoSave: autosave
            };
            $list = copiedList;
            $categories = copiedCategories;
            $listVersion = 0;
            id = copyListName;
            updateListHistory(copyListName, 0);
            console.warn('[ListSettings] Copy to server failed, working offline', e);
            notifications.show(`Liste "${sourceListId}" copiée vers "${copyListName}" (mode local)`, 'success', 4000, { always: true, listId: copyListName });
        }

        // Connect to the new list channel
        try {
            syncManager.connect(copyListName);
            resumeBroadcasts();
        } catch (err) {
            console.warn('[ListSettings] reconnect failed', err);
        }
    }

</script>

<style>
    #version-info {
        position: fixed;
        bottom: 10px;
        right: 10px;
        text-align: right;
    }

    .settings-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 16px;
    }

    .settings-section {
        margin-bottom: 24px;
    }

    .section-content {
        padding: 16px;
    }

    .button-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
    }

    .list-name-field {
        width: 100%;
        margin-bottom: 12px;
    }
</style>

<div class="settings-container">
    <!-- Section 1: List Management -->
    <Paper class="settings-section" elevation={3}>
        <Title>Gestion des Listes</Title>
        <Content class="section-content">
            <div class="list-name-field">
                <Autocomplete
                    bind:value={id}
                    options={listSuggestions}
                    label="Nom de la liste"
                    on:SMUIAutocomplete:selected={onListSelected}
                    style="width: 100%;"
                >
                    <HelperText slot="helper">Sélectionnez ou entrez un nom de liste</HelperText>
                </Autocomplete>
            </div>
            <div class="button-group">
                <Button on:click={openCreateListDialog} variant="raised" color="primary">
                    <Icon class="material-icons">add</Icon>
                    <Label>Créer nouvelle liste...</Label>
                </Button>
                <Button on:click={save} variant="raised" disabled={!id || id.trim() === ''}>
                    <Icon class="material-icons">save</Icon>
                    <Label>Sauvegarder</Label>
                </Button>
                <Button on:click={onListSelected} variant="raised" disabled={!id || id.trim() === ''}>
                    <Icon class="material-icons">refresh</Icon>
                    <Label>Charger</Label>
                </Button>
                <Button on:click={openCopyListDialog} variant="raised" disabled={!id || id.trim() === ''}>
                    <Icon class="material-icons">content_copy</Icon>
                    <Label>Copier...</Label>
                </Button>
            </div>
        </Content>
    </Paper>

    <!-- Section 2: Import/Export -->
    <Paper class="settings-section" elevation={3}>
        <Title>Import/Export</Title>
        <Content class="section-content">
            <div class="button-group">
                <Button on:click={downloadJSON} variant="raised">
                    <Icon class="material-icons">download</Icon>
                    <Label>Exporter</Label>
                </Button>
                <Button on:click={uploadJSON} variant="raised">
                    <Icon class="material-icons">upload</Icon>
                    <Label>Importer</Label>
                </Button>
            </div>
        </Content>
    </Paper>

    <!-- Section 3: Switches -->
    <Paper class="settings-section" elevation={3}>
        <Title>Préférences</Title>
        <Content class="section-content">
            <FormField>
                <Switch bind:checked={autosave} 
                    on:SMUISwitch:change={() => {
                        console.log(`Auto-save changed: ${autosave}`);
                        $settings = {
                            id: $settings.id,
                            autoSave: autosave,
                        };
                        console.log(`Settings updated: ${JSON.stringify($settings)}`);
                    }}/>
                <span slot="label">Sauvegarde automatique</span>
            </FormField>
            <HelperText>Si activée, chaque modification est automatiquement sauvegardée en base de données</HelperText>
            
            <FormField style="margin-top: 16px;">
                <Switch bind:checked={notifyEnabled} 
                    on:SMUISwitch:change={() => {
                        console.log(`Notifications changed: ${notifyEnabled}`);
                        $enableNotifications = notifyEnabled;
                        console.log(`Notifications enabled: ${$enableNotifications}`);
                    }}/>
                <span slot="label">Activer les notifications</span>
            </FormField>
            <HelperText>Affiche des notifications lorsqu'un autre utilisateur modifie la liste</HelperText>
        </Content>
    </Paper>

    <div id="version-info">
        {#if $versionInfo}
            <Button onclick={() => {}} href="https://github.com/b3b00/liste/commit/{$versionInfo.hash}" target="_blank">
                <Label>{$versionInfo.version}</Label>
            </Button>
        {/if}
    </div>
</div>

<!-- Create List Dialog -->
<Dialog
    bind:open={openCreateDialog}
    selection
    aria-labelledby="create-list-title"
    aria-describedby="create-list-content"
    on:SMUIDialog:closed={closeCreateDialog}
>
    <Title id="create-list-title" style="margin-left:15px;font-size:20px;color:rgba(0,0,0,0.87)">Créer une nouvelle liste</Title>
    <Content id="create-list-content">
        <Textfield bind:value={createListName} label="Nom de la liste" style="width: 100%;" />
    </Content>
    <Actions>
        <Button>
            <Label>Annuler</Label>
        </Button>
        <Button action="create">
            <Label>Créer</Label>
        </Button>
    </Actions>
</Dialog>

<!-- Copy List Dialog -->
<Dialog
    bind:open={openCopyDialog}
    selection
    aria-labelledby="copy-list-title"
    aria-describedby="copy-list-content"
    on:SMUIDialog:closed={closeCopyDialog}
>
    <Title id="copy-list-title" style="margin-left:15px;font-size:20px;color:rgba(0,0,0,0.87)">Copier la liste</Title>
    <Content id="copy-list-content">
        <Textfield bind:value={copyListName} label="Nom de la nouvelle liste" style="width: 100%;" />
    </Content>
    <Actions>
        <Button>
            <Label>Annuler</Label>
        </Button>
        <Button action="copy">
            <Label>Copier</Label>
        </Button>
    </Actions>
</Dialog>

