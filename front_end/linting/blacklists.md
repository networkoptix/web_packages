# Linting blacklists

Sometimes we will have certain code or standards we want to remove from the codebase,
but there are too many changes to be done at once. In these cases, linting blacklists
serve two purposes:

1. Prohibiting it in new files will prevent the issue from growing
2. Having an explicit list of where the issue remains functions as a to-do list for cleanup

## Updating
When fixing issues:

1. Comment out or remove the file(s) to be worked on from the blacklist
2. Restart the ESLint server or your IDE
3. Fix the errors in the files
4. Run the npm script to update the blacklist with other changes
