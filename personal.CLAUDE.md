~/projects is the directory holding all locally cloned git repositories
~/projects/be-shared contains the authoritative version of all java "shared-*/dibs-*" dependencies
Ask before searching be-shared from other projects - you will be tempted to scan it more often than appropriate.
The ~/project sub-directory names should match the github repo names
Avoid querying ~/.m2 - only after exhausting be-shared should this be checked
When asked to provide/create a csv, actually create a ".csv" file in /tmp
Never try to grep within the top level directory "~/projects" only ever grep within a specific sub-folder.