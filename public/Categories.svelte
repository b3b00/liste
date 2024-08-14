<script lang="ts">

    import { onMount } from "svelte";
    import Dialog, { Title, Content, Actions, InitialFocus } from '@smui/dialog';
    import List, { Item, Graphic, Text } from '@smui/list';
    import Radio from '@smui/radio';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import 'material-design-inspired-color-picker';
    import {categories} from './store';
    import {Category} from './model';
    import { action } from "@smui/icon-button/src/IconButton.svelte"
    
    categories.useLocalStorage();

    let open : boolean = false;

    let categoryLabel:string = "";
    let categoryColor:string = "#000000";
    let oldCategoryLabel:string = "";
    let oldCategoryColor:string = "#000000";
    let editionMode: boolean = false;

    onMount(() => {
        })

    function closeHandler(e: CustomEvent<{ action: string }>) {
        console.log(e);
        if (e.detail.action === 'OK') {
            if (editionMode) {
                console.log(`edit a category ${oldCategoryLabel}->${categoryLabel}:${oldCategoryColor}->${categoryColor}`);
                let categos = $categories;
                categos = categos.map(x => {
                    if (x.label == oldCategoryLabel) {
                        let category:Category = {label:categoryLabel,color:categoryColor};
                        return category;
                    }
                    return x;
                })                
                $categories = categos;
                oldCategoryColor = "#000000";
                oldCategoryLabel = "";
                categoryColor = "#000000";
                categoryLabel = "";
            }
            else {
                console.log(`add a category >${categoryLabel}<:>${categoryColor}<`);
                let category:Category = {label:categoryLabel,color:categoryColor};
                let categos = $categories;
                categos.push(category);
                $categories = categos;
                categoryColor = "#000000";
                categoryLabel = "";
            }
            editionMode = false;
        }
        else if (e.detail.action === 'delete') {
            console.log(`remove a category >${categoryLabel}<:>${categoryColor}<`);
            let category:Category = {label:categoryLabel,color:categoryColor};
            let categos = $categories;
            categos = categos.filter(x => x.label !== oldCategoryLabel);
            $categories = categos;
            categoryColor = "#000000";
            categoryLabel = "";
        }
        else {
            console.log(`cancel category`)
            categoryColor = "";
            categoryLabel = "";
        }
    }

    //var picker = document.getElementById('picker') // get the color picker element
    function colorChanged (event) {
        console.log('color change : ',event);
        var color = event.detail[0]; // get the color
        console.log('Selected Color:' + color);
        //picker.value = color; // set the value of the picker to the selected color        
        categoryColor = color;
    }
    //picker.addEventListener('change', colorChanged) // add the event to the picker element

    function openEditor(edition:boolean, label:string, color:string) {
        console.log(`open editor ${edition}  - ${label} - ${color}`)
        editionMode = edition;
        oldCategoryColor = color;
        categoryColor = color;
        oldCategoryLabel = label;
        categoryLabel = label;
        open = true;
    }

    </script>
    
    <div>

        <Dialog
  bind:open
  selection
  aria-labelledby="list-selection-title"
  aria-describedby="list-selection-content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="list-selection-title">Dialog Title</Title>
  <Content id="list-selection-content">
    <Textfield bind:value={categoryLabel} label="Label">
        <HelperText slot="helper">nom de la catégorie</HelperText>
    </Textfield>
    <md-color-picker value="{categoryColor}" palette="material-accent" default-tint="300" use-spectrum-picker="true" on:change={colorChanged}></md-color-picker>
  </Content>
  <Actions>
    <Button>
      <Label>Annuler</Label>
    </Button>
    <Button action="delete">
        <label>Supprimer</label> 
    </Button>
    <Button action="OK">
      <Label>OK</Label>
    </Button>
  </Actions>
</Dialog>

<Button on:click={() => { openEditor(false,"","#000000");} }>
  <Label>Open Dialog</Label>
</Button>

<div style="display:flex;flex-direction: column;">
    {#each $categories as category}
        <Button class="button-shaped-round" style="background-color:{category.color}" color="{category.color}" on:click={openEditor(true,category.label,category.color)}>{category.label} </Button>         
    {/each}

</div>


    </div>