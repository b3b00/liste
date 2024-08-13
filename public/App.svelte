<script lang="ts">

    import C1 from "./C1.svelte";    
    import C2 from "./C2.svelte";
    import C3 from "./C3.svelte";
    import Home from "./Home.svelte";  
    
    import Router from 'svelte-spa-router';
    

    const routes = {
        // Exact path
        
        // Using named parameters, with last being optional
        '/c1/:message': C1,
        '/c2/:message': C2,
        '/C3/:message': C3,
        '*': Home,
    }

    

</script>
<div style="display:flex;flex-direction: column;">

    <div style="display:flex; flex-direction: row;">
        <a href="#/home">home</a>
        <a href="#/C1/welcome%20to%20component1">C1</a>
        <a href="#/C2/here%20is%20component2">C2</a>
        <a href="#/C3/component3%20is%20in%20the%20place">C3</a>
        <a href="/test">TEST</a>
    </div>
    <hr>
 <Router {routes}/> 
<hr>
<C1 message="this is static C1" params="{{}}"></C1>
</div>