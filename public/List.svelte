<script lang="ts">

    import { onMount } from "svelte";
    import { list, categories, displayDoneItems, itemsHistory, listMode } from './store';
    import {ListMode, type Category, type ShopItem} from './model';
    import Paper, { Title, Content } from '@smui/paper';
    import IconButton from '@smui/icon-button'
    import Button, { Group, GroupItem, Label, Icon } from '@smui/button';
    import Menu from '@smui/menu';
    import List, { Item, Text } from '@smui/list';
    import TrashCanOutline from "svelte-material-icons/TrashCanOutline.svelte";
    import EyeOutline from "svelte-material-icons/EyeOutline.svelte";
    import EyeOffOutline from "svelte-material-icons/EyeOffOutline.svelte";
    import Check from "svelte-material-icons/Check.svelte";
    import Alert from "svelte-material-icons/Alert.svelte";
    import Autocomplete from '@smui-extra/autocomplete';
    import Dialog, {Actions }  from '@smui/dialog';
    import {isDark} from './colors';


    list.useLocalStorage();
    categories.useLocalStorage();
    displayDoneItems.useLocalStorage();
    itemsHistory.useLocalStorage();

        let itemsByCategory : {[category:string]:{color:string,items:ShopItem[]}}= {};

        let openDelete: boolean = false;

        let item : string = "";

        let itemCategory : string = "";

        let itemColor : string = "";

        let menus : {[item:string]:Menu} = {};

        let suggestions : {[item:string]:string[]} = {};

        let suggestionSelection : {[item:string]:string} = {};

        let mode : ListMode = ListMode.Edit;

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
              const existingSuggestions = Object.hasOwn($itemsHistory,category.label) ? $itemsHistory[category.label] : [];
              const currentItems = Object.hasOwn(itemsByCategory,category.label) ? itemsByCategory[category.label].items : []; 
              const filteredSuggestions = existingSuggestions.filter(x => !currentItems.map(x => x.label).includes(x));
              suggestions[category.label] = filteredSuggestions;
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
                let items = $list;
                let max = items.length == 0 ? 0 : Math.max(...(items.map(x => x.id)));
                let itemId = max+1;
                let shopItem : ShopItem = {label : itemLbl, category : itemCat, color :itemCol, done:false, id:itemId};
                items.push(shopItem);
                $list = items;
                updateItemsByCategory();
                $categories = $categories;
                let categoryHistory : string[] = []
                let history = $itemsHistory;
                if (Object.hasOwn(history,itemCat)) {
                  categoryHistory = history[itemCat];
                }
                categoryHistory.push(shopItem.label);
                categoryHistory = [...new Set(categoryHistory)];
                history[itemCat] = categoryHistory;
                $itemsHistory = history;
                updateItemsByCategory();
                updateSuggestions();
        }

        function shop(itemId: number) {

            let items = $list;
            items = items.map( x => {
                if (x.id == itemId) {
                    x.done = !x.done;
                }
                return x; 
            })
            $list = items;
            updateItemsByCategory();
            updateSuggestions();
        }

        function remove(itemId: number) {
            let items = $list;
            items = items.filter( x => x.id !== itemId)
            $list = items;
            updateItemsByCategory();
            updateSuggestions();
        }
        function move(itemId: number) {
            let items = $list;
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

        // DELETE ALL

        function closeConfirmDelete(e: CustomEvent<{ action: string }>) {
          console.log(`closing confirm delete dialog with [${e.detail.action}]`)
          if (e.detail.action === 'delete') {
            clean();
          }
          openConfirmDelete(false);
        }

        function openConfirmDelete(opened : boolean = true) {
          console.log('opening confirm delete '+opened);
          openDelete = opened;
        }

        // MOVE

        let movingItem: ShopItem|undefined;

        let openMove: boolean;

        function openMoveDialog(item: ShopItem) {
          openMove = true;
          movingItem = item;
        }


        function moveToCategory(item: ShopItem|undefined, destCategory: Category|undefined) {
          console.log("> moveToCategory()",item,destCategory)
          if (item && destCategory) {
            console.log(`moving ${item.id}-${item.label} to category ${destCategory.label}`,movingItem,destCategory);
            let it = item;
            openMove = false;
            movingItem = undefined;

            let items = $list;
            items = items.map( x => {
              if (x.id == it.id) {
                console.log(`move item before => ${destCategory.label} - ${destCategory.color}: `,x)
                x.category = destCategory.label;
                x.color = destCategory.color;
                console.log('move item after : ',x)
              }
              return x;

          })
            $list = items;
            updateItemsByCategory();
            updateSuggestions();
          }
        }
    </script>
    
    <div>

      <Dialog
      bind:open={openDelete}
      selection
      aria-labelledby="list-selection-title"
      aria-describedby="list-selection-content"
      on:SMUIDialog:closed={closeConfirmDelete}
    >
    <Title id="list-selection-title" style="color:red;margin-left:15px;font-size:20px">Êtes vous sûr de vouloir tout supprimer !?</Title>
  <Content id="list-selection-content">
    
    </Content>
    <Actions>
    <Button color="red">
      <Label>Annuler</Label>
    </Button>
    <Button action="delete" style="color:#ff0000">
      <Alert></Alert>Tout supprimer !
    </Button>
  </Actions>
    </Dialog>


    <Dialog
      bind:open={openMove}
      selection
      aria-labelledby="list-selection-title"
      aria-describedby="list-selection-content"
      on:SMUIDialog:closed={() => { 
        openMove = false;
        movingItem = undefined;
        }
      }
    >
    <!-- <Title id="list-selection-title" style="color:red;margin-left:15px;font-size:20px">Déplacer vers une autre catégorie</Title> -->
  <Content id="list-selection-content">
    <List>
      {#each $categories as category}
        {#if category.label != movingItem?.category}
        <Item
          on:click={() => {
            console.log('on click category ',category);
            moveToCategory(movingItem, category);
          }}
        >
          <Text style="font-weight:bold;align:center;color:{category.color}">{category.label.toUpperCase()} </Text>
        </Item>
        {/if}
      {/each}
    </List>
    </Content>
    </Dialog>

        
{#if !displayAll} 
<Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={() => showChecked({selected:true})}><EyeOutline></EyeOutline>Afficher les éléments barrés</Button>
{:else}
<Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={() => showChecked({selected:false})}><EyeOffOutline></EyeOffOutline>Masquer les éléments barrés</Button>
{/if}
<Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white; float:right" on:click={() => openConfirmDelete(true)} >
  <TrashCanOutline></TrashCanOutline>Tout effacer
</Button>
        {#if itemsByCategory}
            {#each Object.entries(itemsByCategory) as [category,content]}
                {#if $listMode == ListMode.Edit || ($listMode == ListMode.Shop && content.items && content.items.length > 0)}
                <Paper square style="margin-bottom:25px" variant="outlined">
                  
                    <Title style="color:{content.color};font-weight:bold;text-decoration:underline">
                      <div style="display:flex;flex-direction:column">
                        <Text>
                      {category} 
                    </Text>
                    {#if $listMode == ListMode.Edit}
                      <div style="display:flex;flex-direction:row">
                      <Autocomplete label="Ajouter..." combobox options={suggestions[category]} bind:value={suggestionSelection[category]} ></Autocomplete>
                      <IconButton on:click={() => { 
                          AddOrUpdate(suggestionSelection[category],category,content.color);
                          suggestionSelection[category] = "";
                          suggestionSelection = suggestionSelection;
                          console.log(suggestionSelection);
                        } 
                        }>
                        
                      <Check></Check>
                      </IconButton> 
                    </div>
                    {/if}
                  </div>
                    </Title>
                    <Content>

                        {#if (content.items && content.items.length > 0)}
                            {#each content.items as categoryItem} 
                                <Group variant="raised">
                                    <Button on:click={() => shop(categoryItem.id)} variant="raised"
                                        style="font-weight:900; color:black;background-color:{categoryItem.color};text-decoration: {categoryItem.done ? 'line-through' : ''}">
                                      <Label style="color:{isDark(categoryItem.color) ? 'white' : 'black'}">{categoryItem.label}</Label>
                                    </Button>
                                    <div use:GroupItem>
                                      <Button
                                        style="font-weight:bold; padding: 0; min-width: 36px;color:black;background-color:{categoryItem.color};text-decoration: {categoryItem.done ? 'line-through' : ''}"
                                        on:click={() => menus[categoryItem.id].setOpen(true)}
                                        variant="raised">
                                        <Icon class="material-icons" style="margin: 0;">arrow_drop_down</Icon>
                                      </Button>
                                      <Menu bind:this={menus[categoryItem.id]} anchorCorner="TOP_LEFT">
                                        <List>
                                          <Item on:SMUI:action={() => remove(categoryItem.id)}>
                                            <Text>Supprimer</Text>
                                          </Item>
                                          <Item on:SMUI:action={() => openMoveDialog(categoryItem)}>
                                            <Text>Déplacer</Text>
                                          </Item>
                                        </List>
                                      </Menu>
                                    </div>
                                  </Group>
                            {/each}
                        {/if}
                    </Content>
                </Paper>
                {:else}
                  <!-- Text  style="display:block;color:{content.color};font-weight:600;text-decoration:underline;font-size:30px;margin-bottom:25px;margin-left:15px">{category}</Text -->
                {/if}
            {/each}
        {/if}
    </div>