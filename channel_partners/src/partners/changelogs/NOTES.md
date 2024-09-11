
### About changelog changes category

**General changes** are not breaking, developer can ignore them and expect the same behavior from the API.

**Minor breaking** could cause some bug in the consumer, like a field changing. But it is expected to be quick to fix.

**Major breaking** could cause a lot of bugs in the consumer, like a field changing its type or endpoint schema changes.
It is expected to take some time to fix.

### Files parsing
To parse the files, headers of versioned changes must be consistent with the following pattern:
```markdown
# Changes in v3

## Changes
```