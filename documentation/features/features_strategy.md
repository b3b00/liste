features documentation are defined in documentation/feature/<NAME_OF_THE_FEATURE>
feature folders will contains :

-   description.md : the feature description, defined by me.
-   plan.md : the implementation plan. copilot field. the plan should not get too much implementation details but keep to technical or functional constraints.
-   implementation.md : by copilot, will contains implementation details, specifically if important technical reword is needed

if D1 database stucture is needed then produce an sql migration script and places it in db folder. name it after the feature name.

copilot must not starts its implementation without a explicit order after planning step so I could rview and modify plan if needed
