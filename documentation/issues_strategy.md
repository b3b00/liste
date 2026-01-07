
Issues documentation are defined in documentation/issues/<NAME_OF_THE_ISSUE>

Issue folders will contain:
 - description.md : the issue description, defined by me. Should include reproduction steps and observed behavior.
 - plan.md : the fix plan. copilot field. the plan should focus on the specific fix needed, not general solutions.
 - implementation.md : by copilot, will contain implementation details of the fix, specifically if important technical rework is needed.

Copilot must not start its implementation without an explicit order after planning step so I could review and modify plan if needed.

Issues are different from features:
 - Issues are about fixing broken behavior or bugs
 - Features are about adding new functionality
 - Issue fixes should be targeted and minimal
 - Feature implementations can be broader
