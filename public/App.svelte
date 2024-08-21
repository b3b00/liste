<script lang="ts">
  
    import Categories from "./Categories.svelte";
    import ShopList from "./List.svelte";    
    import {push} from 'svelte-spa-router'
    import Router from 'svelte-spa-router'
    import Button, {Label} from '@smui/button';  
    import IconButton from '@smui/icon-button';
    import TopAppBar, {Row, Section} from '@smui/top-app-bar';  
    import {AppContent} from '@smui/drawer';
    import Cart from "svelte-material-icons/Cart.svelte";
    import FormatListBulleted from "svelte-material-icons/Shape.svelte";
    import Pen from "svelte-material-icons/Pen.svelte";
    import { onMount } from 'svelte';
    import { ListMode } from "./model"
    import { listMode } from "./store";

    const routes = {
      '/categories': Categories,
      '/list': ShopList,
      '/': ShopList,
  }
  
      onMount(async () => {});


  let prominent = false;
    let dense = true;
    let secondaryColor = false;

      let open = false;

      

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
          <!-- Note: this doesn't fire the MDCIconButtonToggle:change event. -->
          <Button on:click={() => {$listMode = ListMode.Edit; push('/list');} }>
            <Label>Édition</Label>
          </Button>
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => {$listMode = ListMode.Shop; push('/list');}} toggle>
            <Cart></Cart>
          </IconButton>
          &nbsp;
          <!-- Note: this doesn't fire the MDCIconButtonToggle:change event. -->
          <Button on:click={() => {$listMode = ListMode.Shop; push('/list');} }>
            <Label>Shop</Label>
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
      </Row>
    </TopAppBar>
  <AppContent>
    <Router {routes}/>
  </AppContent>
  
  
  
  
  