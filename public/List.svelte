<script lang="ts">

    import Dialog, { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog';
    import { onMount } from "svelte";
    import { list, categories, displayDoneItems, itemsHistory } from './store';
    import {ShopItem} from './model';
    import Paper, { Title, Subtitle, Content } from '@smui/paper';    
    import Textfield from '@smui/textfield';
    import IconButton from '@smui/icon-button'
    import Button, { Group, GroupItem, Label, Icon } from '@smui/button';
    import Menu from '@smui/menu';
    import List, { Item, Separator, Text } from '@smui/list';
    import TrashCanOutline from "svelte-material-icons/TrashCanOutline.svelte";
    import EyeOutline from "svelte-material-icons/EyeOutline.svelte";
    import EyeOffOutline from "svelte-material-icons/EyeOffOutline.svelte";
    import Check from "svelte-material-icons/Check.svelte";
    import Autocomplete from '@smui-extra/autocomplete';
    

    list.useLocalStorage();
    categories.useLocalStorage();
    displayDoneItems.useLocalStorage();
    itemsHistory.useLocalStorage();

        let itemsByCategory : {[category:string]:{color:string,items:ShopItem[]}}= {};
   
        let open: boolean = false;

        let item : string = "";

        let itemCategory : string = "";

        let itemColor : string = "";

        let menus : {[item:string]:Menu} = {};

        let suggestions : {[item:string]:string[]} = {};

        let suggestionSelection : {[item:string]:string} = {};


        let displayAll : boolean = true;

        function updateItemsByCategory() {
            itemsByCategory = {};
            let items = $list;
            let categos = $categories;
            categos.forEach(category => {
              let its = items.filter(x => { 
                  let selected = x.category == category.label && (!x.done || displayAll);
                  return selected;
                } 
              );
                itemsByCategory[category.label] = {color:category.color, items : its};
            });
          }

        function updateSuggestions() {
            for(let i = 0; i < $categories.length; i++) {
              
              const category = $categories[i];
              console.log(`*********** [[${category.label}]] ***********`);
              console.log(`building suggestions for ${category.label}`);
              const existingSuggestions = Object.hasOwn($itemsHistory,category.label) ? $itemsHistory[category.label] : [];
              console.log('existing suggestions are ',existingSuggestions);
              const currentItems = Object.hasOwn(itemsByCategory,category.label) ? itemsByCategory[category.label].items : []; 
              console.log('already used items are',currentItems);
              const filteredSuggestions = existingSuggestions.filter(x => !currentItems.map(x => x.label).includes(x));
              console.log('filtered suggestions are',filteredSuggestions);
              suggestions[category.label] = filteredSuggestions;
              console.log('**********************');
            }
        }  

        onMount(() => {
            updateItemsByCategory();
            updateSuggestions();
        })

        function AddOrUpdate(itemLbl : string, itemCat: string, itemCol : string) {
          if (!itemLbl || itemLbl == undefined || itemLbl === null || itemLbl === '') {
            return;
          }
          console.log(`adding item ${itemLbl} to category ${itemCat}`)
                let items = $list;
                console.log('before add',$list);
                let shopItem : ShopItem = {label : itemLbl, category : itemCat, color :itemCol, done:false};
                items.push(shopItem);
                $list = items;
                console.log('after add',$list);
                updateItemsByCategory();
                $categories = $categories;
                console.log('manage items history',$itemsHistory);
                let categoryHistory : string[] = []
                let history = $itemsHistory;
                if (Object.hasOwn(history,itemCat)) {
                  console.log(`found history for ${itemCat}`,history[itemCat])
                  categoryHistory = history[itemCat];
                }
                categoryHistory.push(shopItem.label);
                categoryHistory = [...new Set(categoryHistory)];
                history[itemCat] = categoryHistory;
                console.log('after history :: ',history);
                $itemsHistory = history;
                console.log('after history (store):: ',$itemsHistory);
                updateItemsByCategory();
                updateSuggestions();
        }

        function closeHandler(e: CustomEvent<{ action: string }>) {
            console.log(e);
            if (e.detail.action === 'OK') {
                AddOrUpdate(item,itemCategory,itemColor);
            }
            else if (e.detail.action === 'delete') {
                let items = $list;
                $list = items.filter(x => x.label !== item);
                updateItemsByCategory();
            }
            else {
                console.log(`cancel item`)            
            }
        }

        function openEditor(itemLabel:string, category:string, color:string) {
            item = itemLabel;
            // suggestions = Object.hasOwn($itemsHistory,category) ? $itemsHistory[category] : [];
            // const currentItems = Object.hasOwn(itemsByCategory,category) ? itemsByCategory[category].items : []; 
            // suggestions = suggestions.filter(x => !currentItems.includes(x));
            itemCategory = category;
            itemColor = color;
            open = true;
        }

        function shop(itemLabel: string) {

            let items = $list;
            items = items.map( x => {
                if (x.label == itemLabel) {
                    x.done = !x.done;
                }
                return x; 
            })
            $list = items;
            updateItemsByCategory();
            updateSuggestions();
        }

        function remove(itemLabel: string) {
            let items = $list;
            items = items.filter( x => x.label !== itemLabel)
            $list = items;
            updateItemsByCategory();
            updateSuggestions();
        }

        function clean() {
            $list = [];
            updateItemsByCategory();
            updateSuggestions();
        }

        function showChecked(event : {selected:boolean}) {
          $displayDoneItems = event.selected;
          displayAll = event.selected;
          console.log(`check : ${displayAll} - ${$displayDoneItems}`);
          updateItemsByCategory();
        }

    </script>
    
    <div>
        <Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={clean}>
          <TrashCanOutline></TrashCanOutline>Tout effacer
        </Button>
{#if !displayAll} 
<Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={() => showChecked({selected:true})}><EyeOutline></EyeOutline>Afficher les éléments barrés</Button>
{:else}
<Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={() => showChecked({selected:false})}><EyeOffOutline></EyeOffOutline>Masquer les éléments barrés</Button>
{/if}

        <!-- <FormField align="end">
            <Switch bind:checked={displayAll} on:SMUISwitch:change={(event => showChecked(event))}/>
            <span slot="label">Afficher tout.</span>
          </FormField> -->
        {#if itemsByCategory}
            {#each Object.entries(itemsByCategory) as [category,content]}

                <Paper square style="margin-bottom:25px">
                    <Title style="color:{content.color}">{category} 
                      <Autocomplete combobox options={suggestions[category]} bind:value={suggestionSelection[category]} ></Autocomplete>
                      <IconButton on:click={() => { 
                          AddOrUpdate(suggestionSelection[category],category,content.color);
                          console.log('reset suggestion selection ...')
                          suggestionSelection[category] = "";
                          suggestionSelection = suggestionSelection;
                          console.log(suggestionSelection);
                        } 
                        }>
                      <Check></Check>
                      </IconButton> 
                    </Title>
                    <Content>

                        {#if (content.items && content.items.length > 0)}
                            {#each content.items as categoryItem} 
                                <Group variant="raised">
                                    <Button on:click={() => shop(categoryItem.label)} variant="raised"
                                        style="color:black;font-weight: bold;background-color:{categoryItem.color};text-decoration: {categoryItem.done ? 'line-through' : ''}">
                                      <Label>{categoryItem.label}</Label>
                                    </Button>
                                    <div use:GroupItem>
                                      <Button
                                        style="padding: 0; min-width: 36px;color:black;font-weight: bold;background-color:{categoryItem.color};text-decoration: {categoryItem.done ? 'line-through' : ''}"
                                        on:click={() => menus[categoryItem.label].setOpen(true)}
                                        variant="raised">
                                        <Icon class="material-icons" style="margin: 0;">arrow_drop_down</Icon>
                                      </Button>
                                      <Menu bind:this={menus[categoryItem.label]} anchorCorner="TOP_LEFT">
                                        <List>
                                          <Item on:SMUI:action={() => remove(categoryItem.label)}>
                                            <Text>Supprimer</Text>
                                          </Item>
                                        </List>
                                      </Menu>
                                    </div>
                                  </Group>
                            {/each}
                        {/if}
                    </Content>
                </Paper>
            {/each}
        {/if}


        <Dialog
        bind:open
        selection
        aria-labelledby="list-selection-title"
        aria-describedby="list-selection-content"
        on:SMUIDialog:closed={closeHandler}
      >
        <DialogTitle id="list-selection-title" style="color:{itemColor}">{itemCategory}</DialogTitle>
        <DialogContent id="list-selection-content">
          <Textfield bind:value={item} label="..."></Textfield>
          <!-- {#if suggestions && suggestions.length > 0}
            {#each suggestions as sugg}
              <Button on:click={() => {item = sugg.label;}}>{sugg.label}</Button>
              
            {/each}  
          {/if} -->
        </DialogContent>
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


    </div>