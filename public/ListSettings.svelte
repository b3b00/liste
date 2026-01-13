<script lang="ts">

    import { onMount } from "svelte";
    import { list, settings, categories, versionInfo } from './store';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import { saveList, getList, getVersion, getCurrentUser, isAuthenticated } from "./client"
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';
    import Paper from '@smui/paper';


    list.useLocalStorage();
    settings.useLocalStorage();
    categories.useLocalStorage();
    versionInfo.useLocalStorage();

    let id = '';

    let autosave : boolean = false;
    let user: { id: string; email: string; name: string; picture: string } | null = null;
    let authenticated = false;


     $: console.log(`Settings changed: ${JSON.stringify($settings)}`);

    onMount(async () => {
        id = $settings.id || '';
        autosave = $settings.autoSave;
        //version = await getVersion();
        $versionInfo = await getVersion() || {version:'0.0.0', hash:undefined};
        authenticated = isAuthenticated();
        if (authenticated) {
            user = getCurrentUser();
            console.log('User data in ListSettings:', user);
        }
    });

    async function save() {
        if ($settings.id) {
            await saveList($settings.id, {
                categories: $categories,
                list: $list
            });
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
            } catch (error:any) {
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
    
    .user-paper {
        padding: 16px;
        margin-bottom: 20px;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    
    .user-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
    }
    
    .user-details {
        display: flex;
        flex-direction: column;
    }
    
    .user-name {
        font-weight: 600;
        font-size: 1.1rem;
        margin-bottom: 4px;
    }
    
    .user-email {
        font-size: 0.9rem;
        color: #666;
    }
</style>

<div>
{#if authenticated && user}
    <Paper class="user-paper" elevation={2}>
        <div class="user-info">
            {#if user.picture}
                <img 
                    src={user.picture} 
                    alt={user.name} 
                    class="user-avatar" 
                    referrerpolicy="no-referrer"
                    crossorigin="anonymous"
                    on:error={(e) => {
                        console.error('Failed to load user picture:', user.picture);
                        e.currentTarget.style.display = 'none';
                    }} 
                />
            {:else}
                <div class="user-avatar" style="background: #ccc; display: flex; align-items: center; justify-content: center;">
                    {user.name ? user.name[0].toUpperCase() : '?'}
                </div>
            {/if}
            <div class="user-details">
                <span class="user-name">{user.name}</span>
                <span class="user-email">{user.email}</span>                
            </div>
        </div>
    </Paper>
{/if}

<FormField align="end">
    <Switch bind:checked={autosave} 
    on:SMUISwitch:change={() => {
        console.log(`Switch ON:SMUI:changed:  => ${autosave}`);
        $settings = {
            id:$settings.id,
            autoSave: autosave,
         };
         console.log(`Settings updated: ${JSON.stringify($settings)}`);
    }}/>
      Sauvegarde automatique.
  </FormField>
<br>
     <Textfield bind:value={id} label="Identifiant" outlined>
        <HelperText slot="helper">identifiant de la liste</HelperText>
    </Textfield>
    <Button on:click={async () => {
        $settings = {
            id:id,
            autoSave: $settings.autoSave
         };
        await save();
    }} variant="raised">
        <Label><Icon class="material-icons">save</Icon>Enregistrer</Label>
    </Button>

    <Button on:click={async () => {
        const reloaded = await getList(id);
        if(reloaded) {
            $settings = {
                id:id,
                autoSave: autosave
            };
            $list = reloaded.list;
            $categories = reloaded.categories;
            //await save();
        }
        else {
            window.alert(`Impossible de charger la liste ${id}`);
        }
    }} variant="raised">
        <Label><Icon class="material-icons">refresh</Icon>Recharger</Label>
    </Button>
<br/>
    <Button on:click={downloadJSON} variant="raised">
        <Icon class="material-icons">download</Icon>
        <Label>Exporter</Label>
    </Button>

    <Button on:click={uploadJSON} variant="raised">
        <Icon class="material-icons">upload</Icon>
        <Label>Importer</Label>
    </Button>

    <div id="version-info">
        {#if $versionInfo}
            <Button onclick={() => {}} href="https://github.com/b3b00/liste/commit/{$versionInfo.hash}" target="_blank">
                <Label>{$versionInfo.version}</Label>
            </Button>
        {/if}
    </div>
</div>

