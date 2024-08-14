<script lang="ts">

    import Dialog, { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog';
    import { onMount } from "svelte";
    import { list, categories } from './store';
    import {ShopItem} from './model';
    import Paper, { Title, Subtitle, Content } from '@smui/paper';
    import Button, {Label, Icon} from '@smui/button';
    import Textfield from '@smui/textfield';  
    import Fab, { Icon } from '@smui/fab';

    list.useLocalStorage();
    categories.useLocalStorage();
    
        export let params;

        let open: boolean = false;

        let item : string = "";

        let itemCategory : string = "";

        let itemColor : string = "";
    
        export let message: string = "empty message"

        let itemsByCategory : {[category:string]:ShopItem[]};
    
        function updateItemsByCategory() {
            itemsByCategory = {};
            let items = $list;
            let categories = items.map(x => x.category).filter((value, index, array) => array.indexOf(value) === index);
            categories.forEach(category => {
                itemsByCategory[category] = items.filter(x => x.category == category);
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
            }
            else if (e.detail.action === 'delete') {
                let items = $list;
                $list = items.filter(x => x.label !== item);
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

    </script>
    
    <div>

        <Button on:click={() => open=true}>Ajouter</Button>

        {#each $categories as category}

            <Paper>
                <Title style="color:{category.color}">{category.label}</Title>
                <Content>
                    <Fab style="background-color:{category.color}" on:click={() => openEditor("",category.label,category.color)}>
                        <Icon class="material-icons">plus</Icon>
                      </Fab>
                    {#if (itemsByCategory && Object.hasOwn(itemsByCategory,category.label) && itemsByCategory[category.label] && itemsByCategory[category.label].length > 0)}
                        {#each itemsByCategory[category.label] as categoryItem} 
                            <Button style="background-color:{categoryItem.color}">{categoryItem.label}</Button>
                        {/each}
                    {/if}
                </Content>
            </Paper>
        {/each}


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