<script>

    import Paper from '@smui/paper';
    
    import { onMount } from 'svelte';
    import Day from './Day.svelte';
    import Traveller from './Traveller.svelte';
    import { menus } from '../store.js';
    import { tick } from 'svelte';
    import {_startOfWeekDate,_parseDate,_parseLinkDate,_formatShortDate,_formatDisplayDate, _addDaysToDate} from './time.js'

    let menusOfWeek = []

    let startDay = null;

    export let params = {};

    $:{
        const start = params.first;
        if (start !== undefined && start !== null) {
            setDays(_parseLinkDate(start));
        }
    }

    onMount(async () => {
            let date = new Date();
            if (!startDay) {
                date = _parseDate(startDay);    
            }
            setDays(date);
        });

 
        menus.useLocalStorage();

        let selection = []

        function select(data) {   
            swap();                      
        }

        function swap() {
            let select = menusOfWeek.filter(x => x.checkedDinner || x.checkedLunch);
            if (select.length == 2) {
                let firstDay = select[0];
                let secondDay = select[1];
                let firstValue = firstDay.checkedLunch ? firstDay.lunch : firstDay.dinner;
                let secondValue = secondDay.checkedLunch ? secondDay.lunch : secondDay.dinner;
                if (firstDay.checkedLunch) {
                    firstDay.lunch = secondValue;                    
                }
                else {
                    firstDay.dinner = secondValue;                    
                }
                if (secondDay.checkedLunch) {
                    secondDay.lunch = firstValue;                    
                }
                else {
                    secondDay.dinner = firstValue;                    
                }
                update();
            }
            else if (select.length == 1 && select[0].checkedLunch && select[0].checkedDinner) {
                let day = select[0];
                const l = day.lunch;
                const d = day.dinner;
                day.lunch = d;
                day.dinner = l;
                update();
            }
        }
 
        

        function onDayChange() {
            
            update();
        }

        function update() {
            if (!Array.isArray(menusOfWeek)) {                
            }
            var newDays = menusOfWeek.map(x => {
                //if (x.id == day.id) {
                    let dday = {}
                    dday.date = x.date;
                    dday.displayDate = x.displayDate;
                    dday.lunch = x.lunch;
                    dday.dinner = x.dinner;             
                    return dday;
            });
            let menuss = $menus;
            menuss[startDay] = newDays;
            $menus = menuss;
            menusOfWeek = $menus[startDay];
        }

        function move(data) {
            startDay = data.detail.day;
            setDays(startDay);
        }
        

        function setDays(date) {
            const realStart = _startOfWeekDate(date)
            startDay = _formatShortDate(realStart);
            const menuss = $menus;
            let ks = Object.keys(menuss);
            var week = menuss[startDay];
            if (week !== null && week !== undefined) {
                week.forEach(element => {
                    if (!element.displayDate) {
                        element.displayDate = _formatDisplayDate(_parseDate(element.date));
                        element.checkedDinner = false;
                        element.checkedLunch = false;
                    }
                });
                menusOfWeek = week;
            }
            else {
                let date = _parseDate(startDay);
                let ms = [];
                for (let i = 0; i < 7; i++) {
                    const d = _formatShortDate(date);
                    const ddate = _formatDisplayDate(date);
                    const element = {
                        "id":i,
                        "lunch":"",
                        "dinner":"",
                        "date":d,
                        "displayDate":ddate,
                        "checkedLunch":false,
                        "checkedDinner":false
                    };
                    ms.push(element);
                    date = _addDaysToDate(date,1);
                }
                menusOfWeek = ms;
            }
            
        }

        

</script>


<div class="container" maincontainer>
    <Traveller start={startDay} on:move={move}></Traveller>
    {#each menusOfWeek as day }
    <Day on:select="{select}"  bind:day="{day}"  on:change={onDayChange} />    
    {/each}
</div>
<div class="container">
    <Paper square variant="outlined">
    </Paper>
</div>
