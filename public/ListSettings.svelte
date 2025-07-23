<script lang="ts">

    import { onMount } from "svelte";
    import { list, settings, categories } from './store';
     import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import { saveList, getList } from "./client"
     import Switch from '@smui/switch';
  import FormField from '@smui/form-field';
    

    list.useLocalStorage();
    settings.useLocalStorage();
    categories.useLocalStorage();

    let id = '';

    let autosave : boolean = false;

    onMount(() => {
        id = $settings.id || '';
        autosave = $settings.autoSave;
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

<div>
    <div>
        <h3>settings</h3>
        <ul>
            <li>Identifiant: {$settings.id}</li>
            <li>Auto-save: {$settings.autoSave ? 'Activé' : 'Désactivé'}</li>
        </ul>
    </div>
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
</div>