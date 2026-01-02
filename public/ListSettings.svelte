<script lang="ts">

    import { onMount } from "svelte";
    import { list, settings, categories, versionInfo } from './store';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import { saveList, getList, getVersion } from "./client"
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';


    list.useLocalStorage();
    settings.useLocalStorage();
    categories.useLocalStorage();
    versionInfo.useLocalStorage();

    let id = '';

    let autosave : boolean = false;


     $: console.log(`Settings changed: ${JSON.stringify($settings)}`);

    onMount(async () => {
        id = $settings.id || '';
        autosave = $settings.autoSave;
        //version = await getVersion();
        $versionInfo = await getVersion() || {version:'0.0.0', hash:undefined};
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
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
</style>

<div>
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

