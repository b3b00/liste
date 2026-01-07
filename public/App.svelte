<script lang="ts">
  
    import Categories from "./Categories.svelte";
    import ShopList from "./List.svelte";
    import Import from "./Import.svelte";
    import ListSettings from "./ListSettings.svelte";
    import Notifications from "./Notifications.svelte";
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
    import Cog from "svelte-material-icons/Cog.svelte";
    import Logout from "svelte-material-icons/Logout.svelte";
    import { onMount, onDestroy } from 'svelte';
    import { ListMode } from "./model"
    import { listMode, list, sharedList, categories, settings, listVersion } from "./store";
    import {compressAndEncodeBase64, decodeBase64AndDecompress} from './zip';
    import { isAuthenticated, getCurrentUser, logout, getListState, saveList } from './client';
    import { syncManager } from './syncManager';
    

    
    list.useLocalStorage();
    sharedList.useLocalStorage();
    listVersion.useLocalStorage();

    const routes = {
      '/categories': Categories,
      '/list/:mode?': ShopList,
      '/': ShopList,
      '/import/:data': Import,
      '/settings': ListSettings
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

        // Check server state before initializing WebSocket sync
        // This prevents stale local data from overwriting fresh server data
        const listId = $settings.id || 'default';
        console.log('[APP] Checking server state for list:', listId);
        
        try {
          const serverState = await getListState(listId);
          if (serverState) {
            const localVersion = $listVersion || 0;
            const serverVersion = serverState.version || 0;
            
            console.log('[APP] Version check - Local:', localVersion, 'Server:', serverVersion);
            
            if (serverVersion > localVersion) {
              console.log('[APP] Server has newer version, updating local data');
              $list = serverState.list;
              $categories = serverState.categories;
              $listVersion = serverVersion;
            } else if (localVersion > serverVersion) {
              console.log('[APP] Local version is newer, will sync to server via WebSocket');
              // Save local version to server since it's newer
              if (listId) {
                await saveList(listId, {
                  list: $list,
                  categories: $categories,
                  version: localVersion
                });
                console.log('[APP] Saved local version to server');
              }
            } else {
              console.log('[APP] Versions match, no update needed');
            }
          } else {
            console.log('[APP] No server state found, using local data');
            // If we have local data but server has none, save to server
            if (listId && ($list.length > 0 || $categories.length > 0)) {
              const version = $listVersion || 0;
              await saveList(listId, {
                list: $list,
                categories: $categories,
                version: version
              });
              console.log('[APP] Initialized server with local data, version:', version);
            }
          }
        } catch (err) {
          console.warn('[APP] Failed to check server state, proceeding with local data:', err);
        }

        // Initialize WebSocket sync using the list ID from settings
        // Reconnection is handled explicitly in ListSettings.svelte when user changes list
        console.log('[APP] Initializing sync with listId:', listId);
        syncManager.connect(listId);
      });

      onDestroy(() => {
        syncManager.disconnect();
      });


  let prominent = false;
    let dense = true;
    let secondaryColor = false;

      let open = false;


  async function shareList() {

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
          <IconButton on:click={() => shareList()} toggle>
            <Share></Share>
          </IconButton>
        </Section>
         <Section align="end" toolbar>
          <IconButton on:click={() => push('/settings')} toggle>
            <Cog></Cog>
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
    <Notifications />
  
  
  
  
  