~/projects is the directory holding all locally cloned git repositories
~/projects/be-shared contains the authoritative version of all java "shared-*/dibs-*" dependencies
Ask before searching be-shared from other projects - you will be tempted to scan it more often than appropriate.
The ~/project sub-directory names should match the github repo names
Avoid querying ~/.m2 - only after exhausting be-shared should this be checked
When asked to provide/create a csv, actually create a ".csv" file in /tmp
Never try to grep/act within the top level directory "~/projects" only ever grep/act within a specific sub-folder.
Prefer shell command `fd` over `find`
When openning Pull Requests in Github, ensure that:
- The relevant JIRA ticket is linked at the foot of the PR description
- Unless otherwise specified, PR's on the ecom-service repo should be assigned to the github group `ecom` for review
When planning/working in a java codebase, make sure to check mcp:dibs-java-dev for relevant convention domains
