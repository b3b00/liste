<script lang="ts">
  
    import Categories from "./Categories.svelte";
    import ShopList from "./List.svelte";
    import Export from "./Export.svelte";
    import {push} from 'svelte-spa-router'
    import Router from 'svelte-spa-router'
    import IconButton from '@smui/icon-button';
    import TopAppBar, {Row, Section} from '@smui/top-app-bar';  
    import Cart from "svelte-material-icons/Cart.svelte";
    import Menu from "svelte-material-icons/Menu.svelte";
    import Shape from "svelte-material-icons/Shape.svelte";
    import Pen from "svelte-material-icons/Pen.svelte";
    import Download from "svelte-material-icons/Download.svelte";
    import Upload from "svelte-material-icons/Upload.svelte";
    import { onMount } from 'svelte';
    import { ListMode } from "./model"
    import { listMode, list } from "./store";
    import Import from "./Import.svelte"
    
    import Drawer, {
    AppContent,
    Content,
    Header,
    Title,
    Subtitle,
    Scrim,
  } from '@smui/drawer';
  import List, { Item, Text} from '@smui/list';

  let open = false;
  let active = 'edit';
 
  function setActive(value: string) {
    active = value;
    open = false;    
  }

    
    list.useLocalStorage();

    const routes = {
      '/categories': Categories,
      '/list': ShopList,
      '/export': Export,
      '/import': Import,
      '/': ShopList,
  }
  
      onMount(async () => {
        // check if items have ids. Set it if not the case.
        let items = $list;
        if (items && items.length > 0) {
          let max = items.length > 0 ? Math.max(...items.map(x => x.id)) : 0;
          max = isNaN(max) ? 0 : max;
          items.forEach(x => { 
            if (!x.id) { 
              max = max +1;
              x.id = max;
            }
            return x;
          });
          $list = items;
        }

        const v = await fetch('/version.json');
        const version : {version:string} = await v.json();
        listeVersion = version.version;
      });

      let listeVersion : string = "";

  let prominent = false;
    let dense = true;
    let secondaryColor = false;
  </script>
  
  
  

  <TopAppBar
      variant="static"
      {prominent}
      {dense}
      color={secondaryColor ? 'secondary' : 'primary'}
    >
      <Row>
        <Section align="start" toolbar>
          
          <IconButton on:click={() => {open = ! open;} } toggle>
            <Menu></Menu>
          </IconButton>
        </Section>
      </Row>
    </TopAppBar>
    <Drawer variant="modal"  bind:open>
      <Header>
        <Title>Liste {listeVersion}</Title>
        <Subtitle>ma liste de courses.</Subtitle>
      </Header>
      <Content>
        <List style="display:flex;flex-direction:column;">
          <Item
            href="javascript:void(0)"
            on:click={() => {setActive('edit'); $listMode = ListMode.Edit; push('/list');} }
            activated={active === 'edit'}>
            <Pen></Pen>
            <Text>Édition</Text>
          </Item>
          <Item
            href="javascript:void(0)"
            on:click={() => {setActive('shop'); $listMode = ListMode.Shop; push('/list');} }
            activated={active === 'shop'}>
            <Cart></Cart>
            <Text>Shop</Text>
          </Item>
          <Item
            href="javascript:void(0)"
            on:click={() => {setActive('categories'); push('/categories');} }
            activated={active === 'categories'}>
            <Shape></Shape>
            <Text>Catégories</Text>
          </Item>
          <Item
            href="javascript:void(0)"
            on:click={() => {setActive('export'); push('/export');} }
            activated={active === 'export'}>
            <Download></Download>
            <Text>Exporter</Text>
          </Item>
          <Item
            href="javascript:void(0)"
            on:click={() => {setActive('import'); push('/import');} }
            activated={active === 'import'}>
            <Upload></Upload>
            <Text>Importer</Text>
          </Item>
        </List>
      </Content>
    </Drawer>
    <Scrim fixed={false} />

  <AppContent>


    <Router {routes}/>
  </AppContent>
  
  
  
  
  