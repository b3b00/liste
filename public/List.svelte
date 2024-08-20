<script lang="ts">

    import Dialog, { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog';
    import { onMount } from "svelte";
    import { list, categories, displayDoneItems, items as itemsHistory } from './store';
    import {ShopItem} from './model';
    import Paper, { Title, Subtitle, Content } from '@smui/paper';    
    import Textfield from '@smui/textfield';
    import IconButton from '@smui/icon-button'
    import Button, { Group, GroupItem, Label, Icon } from '@smui/button';
    import Menu from '@smui/menu';
    import List, { Item, Separator, Text } from '@smui/list';
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';
    import TrashCanOutline from "svelte-material-icons/TrashCanOutline.svelte";
    import EyeOutline from "svelte-material-icons/EyeOutline.svelte";
    import EyeOffOutline from "svelte-material-icons/EyeOffOutline.svelte";

    list.useLocalStorage();
    categories.useLocalStorage();
    displayDoneItems.useLocalStorage();
    itemsHistory.useLocalStorage();

        let itemsByCategory : {[category:string]:{color:string,items:ShopItem[]}}= {};
   
        let open: boolean = false;

        let item : string = "";

        let itemCategory : string = "";

        let itemColor : string = "";

        let menus : {[item:string]:Menu} = {}


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

        onMount(() => {
            updateItemsByCategory();
        })

        function closeHandler(e: CustomEvent<{ action: string }>) {
            console.log(e);
            if (e.detail.action === 'OK') {
                console.log(`adding item ${item} to category ${itemCategory}`)
                let items = $list;
                console.log('before add',$list);
                let shopItem : ShopItem = {label : item, category : itemCategory, color :itemColor, done:false};
                items.push(shopItem);
                $list = items;
                console.log('after add',$list);
                updateItemsByCategory();
                $categories = $categories;
                let categoryHistory : ShopItem[] = []
                let history = $itemsHistory;
                if (Object.hasOwn(history,itemCategory)) {
                  categoryHistory = history[itemCategory];
                }
                categoryHistory.push(shopItem);
                history[itemCategory] = categoryHistory;
                $itemsHistory = history;

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
        }

        function remove(itemLabel: string) {
            let items = $list;
            items = items.filter( x => x.label !== itemLabel)
            $list = items;
            updateItemsByCategory();
        }

        function clean() {
            $list = [];
            updateItemsByCategory();
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
                    <Title on:click={() => openEditor("",category,content.color)} style="color:{content.color}">{category}</Title>
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