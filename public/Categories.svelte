<script lang="ts">

    import { onMount } from "svelte";
    import Dialog, { Title, Content, Actions, InitialFocus } from '@smui/dialog';
    import List, { Item, Graphic, Text } from '@smui/list';
    import Radio from '@smui/radio';
    import Button, {Label, Icon} from '@smui/button';  
    import Textfield from '@smui/textfield';  
    import HelperText from '@smui/textfield/helper-text';
    import 'material-design-inspired-color-picker';
    import {categories, list, itemsHistory} from './store';
    import {Category} from './model';
    import { action } from "@smui/icon-button/src/IconButton.svelte"
    import ChevronUp from "svelte-material-icons/ChevronUp.svelte";
    import ChevronDown from "svelte-material-icons/ChevronDown.svelte";
    
    categories.useLocalStorage();
    list.useLocalStorage();
    itemsHistory.useLocalStorage();

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

                if (oldCategoryColor !== categoryLabel) {
                    let currentList = $list;
                    currentList = currentList.map(x => {
                        if (x.category == oldCategoryLabel) {
                            x.category = categoryLabel
                        }
                        return x;
                    });
                    $list = currentList;
                    let currentHistory = $itemsHistory;
                    if (Object.hasOwn(currentHistory,oldCategoryLabel)) {
                        currentHistory[categoryLabel] = currentHistory[oldCategoryLabel];
                        delete currentHistory[oldCategoryLabel];
                        $itemsHistory = currentHistory;
                    }
                }

                if (oldCategoryLabel !== categoryLabel) {
                    let currentList = $list;
                    currentList = currentList.map(x => {
                        if (x.category == oldCategoryLabel) {
                            x.category = categoryLabel
                        }
                        return x;
                    });
                    $list = currentList;
                    let currentHistory = $itemsHistory;
                    if (Object.hasOwn(currentHistory,oldCategoryLabel)) {
                        currentHistory[categoryLabel] = currentHistory[oldCategoryLabel];
                        currentHistory[categoryLabel] = currentHistory[categoryLabel].map(x => {x.category = categoryLabel; return x});
                        delete currentHistory[oldCategoryLabel];
                        $itemsHistory = currentHistory;
                    }
                }

                if (oldCategoryColor !== categoryColor) {
                    let currentList = $list;
                    currentList = currentList.map(x => {
                        if (x.category == categoryLabel) {
                            x.color = categoryColor;
                        }
                        return x;
                    });
                    $list = currentList;
                    let currentHistory = $itemsHistory;
                    if (Object.hasOwn(currentHistory,categoryLabel)) {                        
                        currentHistory[categoryLabel] = currentHistory[categoryLabel].map(x => {x.color = categoryColor; return x});                        
                    }
                    $itemsHistory = currentHistory;
                }

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

    function up(index:number, category:Category) {
        console.log(`UP @${index} : ${category.label} `,category);
        let items = $categories;
        console.log('UP categories :: ',items);
        let prev = items[index-1];
        console.log('UP prev :: ',prev)
        items[index-1] = category;
        items[index] = prev;
        console.log('after swap :: ',items);

        $categories = items;

    }

    function down(index:number, category:Category) {
        console.log(`DOWN @${index} : ${category.label} `,category);
        let items = $categories;
        let next = items[index+1];

        
        items[index+1] = category;
        items[index] = next;

        $categories = items;
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

<div style="display:flex;flex-direction: column;">
    
    {#each $categories as category, i (i)}
        <div style="display:flex;flex-direction: row; width:100%">
            <Button on:click={() => down(i,category)} style="background-color:{category.color};flex-grow:1"><ChevronDown width="2em" height="2em" color="black"></ChevronDown></Button>
            <Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:{category.color};flex-grow:15" color="{category.color}" on:click={openEditor(true,category.label,category.color)}>{category.label} </Button>         
            <Button on:click={() => up(i,category)} style="background-color:{category.color};flex-grow:1"><ChevronUp width="2em" height="2em" color="black"></ChevronUp></Button>            
        </div>
    {/each}
    <Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={() => { openEditor(false,"","#000000");} }>Nouvelle catégorie...</Button>
</div>


    </div>