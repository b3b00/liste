<script lang="ts">

    import { onMount } from "svelte";
    import { list, settings, categories, versionInfo, enableNotifications, sharedList, listVersion } from './store';
    import { notifications } from './notifications';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import { saveList, getList, getVersion } from "./client"
    import { syncManager, suspendBroadcasts, resumeBroadcasts } from './syncManager';
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';
    import Paper, { Title, Content } from '@smui/paper';


    list.useLocalStorage();
    settings.useLocalStorage();
    categories.useLocalStorage();
    versionInfo.useLocalStorage();
    sharedList.useLocalStorage();
    listVersion.useLocalStorage();

     import type { VersionInfo } from "./model";


    let id = '';

    let autosave : boolean = false;
    let notifyEnabled: boolean = false;


     $: console.log(`Settings changed: ${JSON.stringify($settings)}`);

    onMount(async () => {
        id = $settings.id || '';
        autosave = $settings.autoSave;
        notifyEnabled = $enableNotifications;
        //version = await getVersion();
        $versionInfo = await getVersion() || {version:'0.0.0', hash:undefined};
    });

    async function save() {
        if ($settings.id) {
            const newVersion = ($listVersion || 0) + 1;
            await saveList($settings.id, {
                categories: $categories,
                list: $list,
                version: newVersion
            });
            // Update local version after save
            $listVersion = newVersion;
            notifications.show(`Liste "${$settings.id}" sauvegardée`, 'success', 3000, { always: true, listId: $settings.id });
        }
    }

    async function createNewList() {
        if (!id || id.trim() === '') {
            notifications.show('Veuillez entrer un nom de liste', 'error', 4000, { always: true, listId: id });
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
        const existing = await getList(id);
        if (existing) {
            notifications.show(`Une liste avec le nom "${id}" existe déjà`, 'error', 4000, { always: true, listId: id });
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
            id: id,
            autoSave: autosave
        };
        $list = [];
        
        // Persist the empty list with current categories
        try {
            await saveList(id, { categories: $categories, list: [], version: 0 });
            $listVersion = 0;
            notifications.show(`Liste "${id}" créée`, 'success', 4000, { always: true, listId: id });
        } catch (e) {
            notifications.show(`Erreur lors de la création de la liste "${id}": ${e?.message || e}`, 'error', 6000, { always: true, listId: id });
        }

        // Connect to the new list channel
        try {
            syncManager.connect(id);
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
                id:id,
                autoSave: autosave
            };
            $list = reloaded.list;
            $categories = reloaded.categories;
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
            } catch (error) {
                window.alert(`Erreur lors de l'import: ${error.message}`);
            }
        };
        input.click();
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
                <Textfield bind:value={id} label="Nom de la liste" outlined style="width: 100%;">
                    <HelperText slot="helper">Entrez le nom de la liste</HelperText>
                </Textfield>
            </div>
            <div class="button-group">
                <Button on:click={createNewList} variant="raised" color="primary">
                    <Icon class="material-icons">add</Icon>
                    <Label>Créer nouvelle liste</Label>
                </Button>
                <Button on:click={save} variant="raised">
                    <Icon class="material-icons">save</Icon>
                    <Label>Sauvegarder</Label>
                </Button>
                <Button on:click={loadList} variant="raised">
                    <Icon class="material-icons">refresh</Icon>
                    <Label>Recharger</Label>
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

