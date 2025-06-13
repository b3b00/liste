<script lang="ts">
  
    import Categories from "./Categories.svelte";
    import ShopList from "./List.svelte";    
    import Import from "./Import.svelte";    
    import {push} from 'svelte-spa-router'
    import Router from 'svelte-spa-router'
    import Button, {Label} from '@smui/button';  
    import IconButton from '@smui/icon-button';
    import TopAppBar, {Row, Section} from '@smui/top-app-bar';  
    import Cart from "svelte-material-icons/Cart.svelte";
    import FormatListBulleted from "svelte-material-icons/Shape.svelte";
    import Share  from 'svelte-material-icons/Share.svelte';
    import Pen from "svelte-material-icons/Pen.svelte";
    import Inbox from "svelte-material-icons/Inbox.svelte";
    import { onMount } from 'svelte';
    import { ListMode } from "./model"
    import { listMode, list, sharedList, categories } from "./store";
    import {compressAndEncodeBase64, decodeBase64AndDecompress} from './zip';
    

    
    list.useLocalStorage();
    sharedList.useLocalStorage();

    const routes = {
      '/categories': Categories,
      '/list/:mode?': ShopList,
      '/': ShopList,
      '/import/:data': Import
      }
  
  
      onMount(async () => {
        // check if items have ids. Set it if not the case.
        let items = $list;
        if (items && items.length > 0) {
          console.log('check and set ids for items',$list);
          let max = items.length > 0 ? Math.max(...items.map(x => x.id)) : 0;
          max = isNaN(max) ? 0 : max;
          console.log(`current max is ${max}`);
          items.forEach(x => { 
            if (!x.id) { 
              console.log(`setting id for ${x.category}/${x.label}`);
              max = max +1;
              x.id = max;
            }
            return x;
          });
          $list = items;
        }
      });


  let prominent = false;
    let dense = true;
    let secondaryColor = false;

      let open = false;


  let share = async () => {

    const currentList = $list;
    const currentCategories = $categories;

    const data = {
      list: currentList,
      categories: currentCategories
    };

    const compressedData = await compressAndEncodeBase64(JSON.stringify(data));
    const url = window.location.origin;
    let shareLink = `${url}/#/import/${compressedData}`;

    await navigator.share({
      title: "Partage de la liste de course.",
      text: "Voici la nouvelle liste.",
      url: shareLink
    });
  }
      

  </script>
  
  


  <TopAppBar
      variant="static"
      {prominent}
      {dense}
      color={secondaryColor ? 'secondary' : 'primary'}
    >
      <Row>
        <Section align="end" toolbar>
          <IconButton on:click={() => {$listMode = ListMode.Edit; push('/list');} } toggle>
            <Pen></Pen>
          </IconButton>
          <!-- &nbsp;
          <Button on:click={() => {$listMode = ListMode.Edit; push('/list');} }>
            <Label>Édition</Label>
          </Button> -->
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => {$listMode = ListMode.Shop; push('/list');}} toggle>
            <Cart></Cart>
          </IconButton>
          <!-- &nbsp;
          <Button on:click={() => {$listMode = ListMode.Shop; push('/list');} } >
            <Label>Courses</Label>
          </Button> -->
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => push('/categories')} toggle>
            <FormatListBulleted></FormatListBulleted>
          </IconButton>
          <!-- &nbsp;
          <Button on:click={() => push('/categories')}>
            <Label>Catégories</Label>
          </Button> -->
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => share()} toggle>
            <Share></Share>
          </IconButton>
        </Section>
        {#if $sharedList && $sharedList.categories && $sharedList.categories.length > 0 && $sharedList.list && $sharedList.list.length > 0}
          <Section align="end" toolbar>
            <IconButton on:click={() => push('/list/In')} toggle>
              <Inbox></Inbox>
            </IconButton>
            <!-- &nbsp;
            <Button on:click={() => push('/list/In')}>
              <Label>liste reçue</Label>
            </Button> -->
          </Section>
          
        {/if}
      </Row>
    </TopAppBar>
    <Router {routes}/>
  
  
  
  
  