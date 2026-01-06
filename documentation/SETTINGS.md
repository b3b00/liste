# better settings

split settings in sections. (a section is a SMUI paper component)
 1. listes management
 2. import/export
 2. switches

## section 1 : list management
1 text field with the current list name (may be empty)
3 buttons :
- create a new list (list name is the value of text field) : clicking this button => request to backend => persistence of an empty list and ctegories in D1. only this button allow creation
- save : save the list : requeets to backend that saves to D1
- load : reload list from backend (D1)

## section 2 : import/export
2 buttons: 
 - export : export the current list as a json file(download file name is the list name if exist)
 - import : import a list (and categories) as a json file

## section 3 : switches
2 switches :
 - auto save : if checked every list/category modification is saved to D1(through backend) 
 - enable notiication : if enabled display notifications whenever another client is modifying the list (or catgories)

