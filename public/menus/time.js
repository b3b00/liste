import { endOfWeek, startOfWeek, sub , add, format } from "date-fns";
import { fr } from 'date-fns/locale';

export function _startOfWeekDate(date) {
    let start = startOfWeek(date);
    start = add(start,{"days":1});
    return start;
  }

  export function _endOfWeekDate(date) {
    let end = endOfWeek(date);
    end = add(end,{"days":1});
    return end;
  }

  export function _parseDate(date) {
      if (date != null) {
        var e = date.split("/");
        return new Date(e[2],e[1]-1,e[0]);    
      }
      return new Date();     
  }

  export function _parseLinkDate(date) {
    if (date != null) {
      var e = date.split("-");
      return new Date(e[2],e[1]-1,e[0]);    
    }
    return new Date();     
}

  export function _formatShortDate(date) {
    return format(date,"dd/MM/yyyy")
  }

  export function _formatShortLinkDate(date) {
    return format(date,"dd-MM-yyyy")
  }
                      
  export function _formatDisplayDate(date) {
    const d = format(date, 'EEE d MMM', {locale: fr});
    return d;
  }

  export function _addDaysToDate(date, dayNumber) {
      return add(date,{'days':dayNumber});
  }

  
  export function _subDaysToDate(date, dayNumber) {
    return sub(date,{'days':dayNumber});
}