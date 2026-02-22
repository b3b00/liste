<script>
  import Card from '@smui/card';
  import Paper,{Content, Title} from '@smui/paper';
  import { menus } from '../store.js';
  menus.useLocalStorage();
  import { onMount } from 'svelte';
  import IconButton, {Icon} from '@smui/icon-button';
  import Button from '@smui/button';
  import { createEventDispatcher } from 'svelte';
  import {push} from 'svelte-spa-router'
  import {_startOfWeekDate,_endOfWeekDate,_parseDate,_formatShortLinkDate,_formatDisplayDate,_subDaysToDate,_addDaysToDate} from './time.js'
  
  import StepForward from "svelte-material-icons/StepForward.svelte";
  import StepBackward from "svelte-material-icons/StepBackward.svelte";
  import CalendarToday from "svelte-material-icons/CalendarToday.svelte";

  

  const dispatch = createEventDispatcher();

  export let start = null;

  

  let displayStart = '';

  let displayEnd = '';

  let previousWeek = '';

  let nextWeek = '';

  let previousLink = '';

  let nextLink='';

  let todayLink = '';
  




  onMount(async () => {
    set();
    
    
  });

  $: {
    const t = start;
    set();
  }

  function set() {
    let date = new Date();
    if (start !== null && start !== undefined) {
      date = _parseDate(start);
    }
    let st = _startOfWeekDate(date);
    let en = _endOfWeekDate(date); 
    
    // current week dates
    displayStart = _formatDisplayDate(st);
    
    displayEnd = _formatDisplayDate(en); 
    // travel links
    previousWeek = _subDaysToDate(st,7);
    nextWeek = _addDaysToDate(en,1);

    previousLink = '/menus/'+_formatShortLinkDate(previousWeek);
    nextLink = '/menus/'+_formatShortLinkDate(nextWeek);

    todayLink = '/menus/'+_formatShortLinkDate(_startOfWeekDate(new Date()));
  }

</script>
<div style="margin: 0px auto; width: 100%; flex-flow: column wrap; padding: 10px; display: flex;" travellercardcontainer >
  <Paper square variant="outlined">  
    <Content>
        <div style="margin: 0 auto; width: 100%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: column;">
          <div style="margin: 0 auto; width: 100%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: row; justify-content: center;">
            
            <span style="width:70%;text-align: center;">{displayStart} - {displayEnd}</span>
            
          </div>
          <div style="margin: 0 auto; width: 100%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: row; justify-content: center;">
            <!-- previous week -->
            <IconButton on:click={() => {push(previousLink);} } toggle>
              <StepBackward></StepBackward>
            </IconButton>
            <!-- current week -->
            <IconButton on:click={() => {push(todayLink);} } toggle>
              <CalendarToday></CalendarToday>  
            </IconButton>
            <!-- next week -->  
            <IconButton on:click={() => {push(nextLink);} } toggle>
              <StepForward></StepForward>
            </IconButton>          
          </div>
        </div>        
      </Content>
    </Paper>
</div>