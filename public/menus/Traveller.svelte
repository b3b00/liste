<script>
  import Card from '@smui/card';
  import { menus } from '../store.js';
  menus.useLocalStorage();
  import { onMount } from 'svelte';
  import IconButton, {Icon} from '@smui/icon-button';
  import Button from '@smui/button';
  import { createEventDispatcher } from 'svelte';
  import {_startOfWeekDate,_endOfWeekDate,_parseDate,_formatShortLinkDate,_formatDisplayDate,_subDaysToDate,_addDaysToDate} from './time.js'
  import {push} from 'svelte-spa-router'
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

    previousLink = '#/menus/'+_formatShortLinkDate(previousWeek);
    nextLink = '#/menus/'+_formatShortLinkDate(nextWeek);

    todayLink = '#/menus/'+_formatShortLinkDate(_startOfWeekDate(new Date()));
  }

</script>
<div style="margin: 0px auto; width: 100%; flex-flow: column wrap; padding: 10px; display: flex;" travellercardcontainer >
  <Card>
    <div style="margin: 0 auto; width: 100%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: row;">
      
        <a href="{todayLink}" title="aujourd'hui" style="margin:auto;width:15%;text-align:right;">
        <Icon class="material-icons">today</Icon>  
        </a>
      
    </div>
    <div style="margin: 0 auto; width: 100%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: row;">
      <span style="width:15%;text-align:right;"><a title="semaine précédente" href="{previousLink}"><Icon class="material-icons" style="cursor: pointer;" >skip_previous</Icon></a></span>
      <span style="width:70%;text-align: center;">{displayStart} - {displayEnd}</span>
      <span style="width:15%;text-align:left"><a title="semaine suivante" href="{nextLink}"><Icon style="cursor: pointer;" class="material-icons" >skip_next</Icon></a></span>
    </div>
    </Card>
</div>