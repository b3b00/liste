<script>
  
    import Categories from "./Categories.svelte";
    import ShopList from "./List.svelte";    
    import {push, pop, replace} from 'svelte-spa-router'
    import Router from 'svelte-spa-router'
    
    import Drawer, {AppContent, Content, Header, Title, Subtitle, Scrim} from '@smui/drawer';
    import List, {Item, Text, Separator, Subheader} from '@smui/list';
    import Button, {Label, Icon} from '@smui/button';  
    import IconButton from '@smui/icon-button';
    import TopAppBar, {Row, Section} from '@smui/top-app-bar';  
    
  
    const routes = {
      '/categories': Categories,
      '/list': ShopList,
  }
  
  let drawer;
  let drawerOpen = false;
  let satus = true;
  
      import { onMount } from 'svelte';
    
  
      onMount(async () => {        
          });
  
  
  function toggleDrawer() {
    console.log(`toggling drawer ${open} -> ${!open}`);
    open = ! open;
  }
  
  function toggleAndMove(to) {
    toggleDrawer(); 
    push(to);
  }

  function setActive(item) {
    console.log(`setActive(${item})`);
    toggleDrawer();
    active = item;
  }
  
  let prominent = false;
    let dense = false;
    let secondaryColor = false;

  
      let open = false;
      let active = "";
      
  
  </script>
  
  


  <TopAppBar
      variant="static"
      {prominent}
      {dense}
      color={secondaryColor ? 'secondary' : 'primary'}
    >
      <Row>
        <Section>
          <IconButton class="material-icons" on:click={() => toggleDrawer()}>menu</IconButton>
          <Title>{active}</Title>
        </Section>
        <Section align="end" toolbar>
          <IconButton on:click={() => push('/categories')} toggle>
            <Icon class="material-icons">alarm_off</Icon>
          </IconButton>
         
          &nbsp;
         
          <!-- Note: this doesn't fire the MDCIconButtonToggle:change event. -->
          <Button on:click={() => push('/categories')}>
            <Label>Catégories</Label>
          </Button>

          <!-- <a href="#/categories"><IconButton Catégories</a> -->
        </Section>
        <Section align="end" toolbar>
          <a href="#/list">Liste</a>
        </Section>
      </Row>
    </TopAppBar>
    <!--<Drawer variant="modal" bind:open>
        <Header>
          <Title>Drawer</Title>          
        </Header>
        <Content>
          <List>
            <Item
          href="javascript:void(0)"
          on:click={() => setActive('Inbox')}
          activated={active === 'Inbox'}
        >
          <Icon class="material-icons" aria-hidden="true">inbox</Icon>
          <Text>Inbox</Text>
        </Item>
            <Item
              href="javascript:void(0)"
              on:click={() => setActive('A Space Rocket')}
              activated={active === 'A Space Rocket'}
            >
              <Text>A Space Rocket</Text>
            </Item>
            <Item
              href="javascript:void(0)"
              on:click={() => setActive('100 Pounds of Gravel')}
              activated={active === '100 Pounds of Gravel'}
            >
              <Text>100 Pounds of Gravel</Text>
            </Item>
            <Item
              href="javascript:void(0)"
              on:click={() => setActive('All of the Shrimp')}
              activated={active === 'All of the Shrimp'}
            >
              <Text>All of the Shrimp</Text>
            </Item>
            <Item
              href="javascript:void(0)"
              on:click={() => setActive('A Planet with a Mall')}
              activated={active === 'A Planet with a Mall'}
            >
              <Text>A Planet with a Mall</Text>
            </Item>
          </List>
        </Content>
      </Drawer>-->

  
  <Scrim />
  <AppContent>
    <Router {routes}/>
  </AppContent>
  
  
  
  
  