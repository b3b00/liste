<script lang="ts">
  
    import Categories from "./Categories.svelte";
    import ShopList from "./List.svelte";    
    import {push} from 'svelte-spa-router'
    import Router from 'svelte-spa-router'
    import Button, {Label} from '@smui/button';  
    import IconButton from '@smui/icon-button';
    import TopAppBar, {Row, Section} from '@smui/top-app-bar';  
    import {AppContent} from '@smui/drawer';
    import Snackbar, { Actions, Label } from '@smui/snackbar';
    import Cart from "svelte-material-icons/Cart.svelte";
    import FormatListBulleted from "svelte-material-icons/Shape.svelte";
    import Pen from "svelte-material-icons/Pen.svelte";
    import Help from "svelte-material-icons/Help.svelte";
    import { onMount } from 'svelte';
    import { ListMode } from "./model"
    import { listMode, list } from "./store";
    
    list.useLocalStorage();

    const routes = {
      '/categories': Categories,
      '/list': ShopList,
      '/': ShopList,
  }
  
      onMount(async () => {
        // check if items have ids. Set it if not the case.
        let response = await fetch('version.json');
        if (response.status == 200) {
          let content:{version:string} = await response.json();
          versionText = content.version;
          console.log('version ::',content);
          console.log(`version text : ${versionText}`);
        }

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

      let versionSnack: Snackbar;

      let versionText : string;

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
          &nbsp;
          <Button on:click={() => {$listMode = ListMode.Edit; push('/list');} }>
            <Label>Édition</Label>
          </Button>
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => {$listMode = ListMode.Shop; push('/list');}} toggle>
            <Cart></Cart>
          </IconButton>
          &nbsp;
          <Button on:click={() => {$listMode = ListMode.Shop; push('/list');} }>
            <Label>Courses</Label>
          </Button>
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => push('/categories')} toggle>
            <FormatListBulleted></FormatListBulleted>
          </IconButton>
          &nbsp;
          <Button on:click={() => push('/categories')}>
            <Label>Catégories</Label>
          </Button>
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => { console.log(`opening snack for 500ms with version ${versionText}`);versionSnack.open(); } }>
            <Help></Help>
          </IconButton>
        </Section>
      </Row>
    </TopAppBar>
  <AppContent>
    <Router {routes}/>
    <Snackbar style="color:white" bind:this={versionSnack} labelText={versionText} timeoutMs={4000}>{versionText}</Snackbar>
  </AppContent>
  
  
  
  
  