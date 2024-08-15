<script lang="ts">

    import Dialog, { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog';
    import { onMount } from "svelte";
    import { list, categories } from './store';
    import {ShopItem} from './model';
    import Paper, { Title, Subtitle, Content } from '@smui/paper';
    import Button, {Label, Icon} from '@smui/button';
    import Textfield from '@smui/textfield';  
    import Fab, { Icon } from '@smui/fab';
    import IconButton from '@smui/icon-button'

    list.useLocalStorage();
    categories.useLocalStorage();
    
        export let params;

        let open: boolean = false;

        let item : string = "";

        let itemCategory : string = "";

        let itemColor : string = "";
    
        export let message: string = "empty message"

        let itemsByCategory : {[category:string]:{color:string,items:ShopItem[]}};
    
        function updateItemsByCategory() {
            console.log('updating items by category',$categories,$list);
            itemsByCategory = {};
            let items = $list;
            let categos = $categories;
            categos.forEach(category => {
                itemsByCategory[category.label] = {color:category.color, items : items.filter(x => x.category == category.label)};
            });
            console.log('itemsByCategory :: ',itemsByCategory);
        }

        onMount(() => {
            updateItemsByCategory();
        })

        function closeHandler(e: CustomEvent<{ action: string }>) {
            console.log(e);
            if (e.detail.action === 'OK') {
                console.log(`adding item ${item} to category ${itemCategory}`)
                let items = $list;
                let shopItem : ShopItem = {label : item, category : itemCategory, color :itemColor};
                items.push(shopItem);
                $list = items;
                updateItemsByCategory();
                $categories = $categories;
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
            items = items.filter( x => {
                if (x.label == itemLabel) {
                    x.done = !x.done;
                }
                return x;
            })
            $list = items;
            updateItemsByCategory();
        }

        function clean() {
            $list = [];
            updateItemsByCategory();
        }

    </script>
    
    <div>
        <Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={clean}>Tout effacer</Button>
        
        {#if itemsByCategory}
            {#each Object.entries(itemsByCategory) as [category,content]}

                <Paper square style="margin-bottom:25px">
                    <Title on:click={() => openEditor("",category,content.color)} style="color:{content.color}">{category}</Title>
                    <Content>
                        <!-- <Fab style="background-color:{category.color}" on:click={() => openEditor("",category.label,category.color)}>
                            <Icon class="material-icons">plus</Icon>
                        </Fab> -->
                        {#if (content.items && content.items.length > 0)}
                            {#each content.items as categoryItem} 
                                <Button style="color:black;font-weight: bold;background-color:{categoryItem.color};text-decoration: {categoryItem.done ? 'line-through' : ''}" on:click={() => shop(categoryItem.label)}>{categoryItem.label} </Button>
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