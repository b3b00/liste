<script lang="ts">

    import { onMount } from "svelte";
    import { list, settings, categories, versionInfo } from './store';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import { saveList, getList, getVersion } from "./client"
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';
    import Paper, { Title, Content } from '@smui/paper';
    

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
        <Label>Enregistrer</Label>
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
            await save();
        }
        else {
            window.alert(`Impossible de charger la liste ${id}`);
        }
    }} variant="raised">
        <Label>Recharger</Label>
    </Button>
    <div id="version-info">
        {#if $versionInfo}
            <Paper square variant="outlined" color:"secondary">
                <Title>Outlined Square Paper</Title>
                <Content><Button onclick={() => {}} href="https://github.com/b3b00/liste/commit/{$versionInfo.hash}" target="_blank">
                <Label>{$versionInfo.version}</Label>
            </Button></Content>
            </Paper>
        {/if}
    </div>
</div>

