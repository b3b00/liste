<script>
  
    import C1 from "./C1.svelte";
    import C2 from "./C2.svelte";
    import C3 from "./C3.svelte";    
    import Router from 'svelte-spa-router'
    
    import Drawer, {AppContent, Content, Header, Title, Subtitle, Scrim} from '@smui/drawer';
    import List, {Item, Text, Separator, Subheader} from '@smui/list';
    import Button, {Label, Icon} from '@smui/button';  
    import IconButton from '@smui/icon-button';
    import TopAppBar, {Row, Section} from '@smui/top-app-bar';  
    
  
    const routes = {
      '/c1/:message': C1,    
      '/c2/:message': C2,
      '/c3/:message': C3  
  }
  
  let drawer;
  let drawerOpen = false;
  let satus = true;
  
      import { onMount } from 'svelte';
  
      onMount(async () => {
        window.addEventListener('online', onOnLine);
        window.addEventListener('offline', onOffLine);
          });
  
  
  function toggleDrawer() {
    drawerOpen = ! drawerOpen;
  }
  
  function toggleAndMove(to) {
    toggleDrawer(); 
    push(to);
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
          <IconButton class="material-icons" on:click={() => (open = !open)}>menu</IconButton>
          <Title>Flex Static</Title>
        </Section>
        <Section align="end" toolbar>
          <a href="#/c1/titi">Titi</a>
          <a href="#/c2/grominet">grominet</a>
        </Section>
      </Row>
    </TopAppBar>
    <Drawer variant="dismissible" bind:open>
        <Header>
          <Title>Super Drawer</Title>
          <Subtitle>It's the best drawer.</Subtitle>
        </Header>
        <Content>
          <List>
            <Item
              href="javascript:void(0)"
              on:click={() => setActive('Gray Kittens')}
              activated={active === 'Gray Kittens'}
            >
              <Text>Gray Kittens</Text>
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
      </Drawer>

  
  <Scrim />
  <AppContent>
    <Router {routes}/>
  </AppContent>
  
  
  
  
  