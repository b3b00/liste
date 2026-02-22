<script>
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    import Button, { Label } from '@smui/button';
    import Fab, { Icon } from '@smui/fab';
    import Paper from '@smui/paper';
    import {_startOfWeekDate,_endOfWeekDate,_parseDate,_formatShortDate,_formatDisplayDate} from './time.js'
    // import Dialog, {Title, Content, Actions, InitialFocus} from '@smui/dialog';
    import Textfield from '@smui/textfield'
    import { menus } from '../store.js';
import Autocomplete from '@smui-extra/autocomplete';
    

    onMount(async () => {
        getMeals(); 
    });

    let items = [];
    let clickedList = null;
    let listDialog = null;

    function normalizeMeal(meal) {  
        let str = meal;              
        var map = {
        '-' : ' ',
        '-' : '_',
        'a' : 'á|à|ã|â|À|Á|Ã|Â',
        'e' : 'é|è|ê|É|È|Ê',
        'i' : 'í|ì|î|Í|Ì|Î',
        'o' : 'ó|ò|ô|õ|Ó|Ò|Ô|Õ',
        'u' : 'ú|ù|û|ü|Ú|Ù|Û|Ü',
        'c' : 'ç|Ç',
        'n' : 'ñ|Ñ'
    };
    
    for (var pattern in map) {
        str = str.replace(new RegExp(map[pattern], 'g'), pattern);
    };

    return str.toLowerCase().trim();
};

    function getMeals() {
        let m = []
        const weeks = $menus;
        const keys = Object.keys(weeks);
        for(let i = 0; i < keys.length; i ++) {
            const week = weeks[keys[i]];
            for (let j = 0; j < week.length; j++) {
                const day = week[j]
                let meal = day.lunch;
                if (meal !== null && meal !== undefined && meal !== '') {
                    const norm = normalizeMeal(meal);
                    if (!m.includes(norm)) {                        
                        m.push(norm);
                    }
                    //m.push(normalizeMeal(meal));
                }
                meal = day.dinner;
                if (meal !== null && meal !== undefined && meal !== '') {
                    const norm = normalizeMeal(meal);
                    if (!m.includes(norm)) {                        
                        m.push(norm);
                    }
                }
            }
        }        
        m = m.sort();
        items = m;
    }

    const dispatch = createEventDispatcher();

    function onChange() {
        getMeals();
        dispatch("change",{});
    }

    function toggleLunch() {
        day.checkedLunch = !day.checkedLunch;
        dispatch("select",{});
    }

    function toggleDinner() {
        day.checkedDinner = !day.checkedDinner;
        dispatch("select",{});
    }
    
    $:{
        const d = day;
        getMeals();
    }

    export let day = null;

    let searchCallback = (meal) => {
    };

    function doSearch(time) {
        return (meal) => {
            change(time, meal)
        }
    }

    function search(time) {
        searchCallback = doSearch(time);
        listDialog.open();
    }

    function change(time, meal) {
        if(time !== undefined && time !== null) {            
            day[time] = meal;
            onChange();
        }
        listDialog.close();
    }


</script>

<style>
    .centered {
        margin: auto;
    }
</style>

<div style="margin: 0 auto; width: 100%;  flex-wrap:wrap; padding: 10px;display:flex;flex-direction: column;">
    <Paper square variant="outlined"> 
        <span class="centered" >{_formatDisplayDate(_parseDate(day.date))}</span>
        <div style="margin: 0 auto; width: 80%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: row;">
            <!-- style="width:80%;text-align:left;" -->
            <!-- <Textfield bind:value={day.lunch}  style="width:80%" label="midi" on:change={onChange} width="100%"/> -->
            <Autocomplete label="Déjeuner..." combobox options={items} bind:value={day.lunch}></Autocomplete>
            <Icon class="material-icons" on:click={() => search('lunch')} style="cursor: pointer;width:10%;text-align: center; vertical-align: bottom;" >loupe</Icon>
            <Icon class="material-icons" on:click={toggleLunch} style="cursor: pointer;width:10%;text-align: center; vertical-align: bottom;" >{day.checkedLunch ? "swap_vertical_circle" : "swap_vert"}</Icon>
        </div>
        <div style="margin: 0 auto; width: 80%; flex-grow: 1; flex-wrap:wrap; padding: 10px;display:flex;flex-direction: row;">
            <!-- style="width:80%;text-align:left;" -->
            <!-- <Textfield bind:value={day.dinner}  style="width:80%" label="soir" on:change={onChange} width="100%"/> -->
             <Autocomplete label="Dîner..." combobox options={items} bind:value={day.dinner}></Autocomplete>
            <Icon class="material-icons" on:click={() => search('dinner')} style="cursor: pointer;width:10%;text-align: center; vertical-align: middle;" >loupe</Icon>
            <Icon class="material-icons" on:click={toggleDinner} style="cursor: pointer;width:10%;text-align: center; vertical-align: bottom;" >{day.checkedDinner ? "swap_vertical_circle" : "swap_vert"}</Icon>
        </div>
    </Paper>
    
</div>

    

    <!-- <Dialog bind:this={listDialog} aria-labelledby="list-title" aria-describedby="list-content">
      <Title id="list-title"></Title>
      <Content component={List} id="list-content">
        {#each items as meal}
          <Item on:click={() => {searchCallback(meal)} }>
            <Text>{meal}</Text>
          </Item>
        {/each}
      </Content>
    </Dialog> -->