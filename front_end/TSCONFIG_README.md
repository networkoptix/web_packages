# TSCONFIG README

General information about how tsconfig files are extended within apps and libs.

## Root tsconfigs

These are the base configs that are extended by app and libs.

### tsconfig.base.json

This is the base tsconfig file that is extended by all other tsconfig files in the workspace.

This should have contain all the compiler options that are common to all apps and libs.

The compiler options should be as strict as possible generally conforming to typescript
and angular best practices.

Our goal is to eventually have our project conform to these options.

### tsconfig.json

This is the tsconfig file used by the editor to provide intellisense. In general it should
reflect compiler options within the base tsconfig.

The errors shown in the error should be addressed when developing but won't break builds or tests.

There are also additional tsconfig.json's within child folders that function in the same way for
that directory.

### tsconfig.prod.json

This is the tsconfig file used for builds and tests. It overrides the compilationOptions
that still break builds and tests.


### tsconfig.dev.json

This is the tsconfig file used for local development. It it used to override prod compiler options
with looser options that are easier to work with during development.

## tsconfig.editor-overrides.json

This is the tsconfig file used override the compilationOptions.

The options that are checked in should be our current target for the project.

You can edit this file if you don't want to see the errors in your editor. But it is
recommended that you leave all the options as true and fix the errors within new
code that you write or if you're already modifying related code.

Do not check in changes to this file unless you are changing the target for the project.

To prevent this file from being updated accidentally we've added really strict codeowner
rules and will require approval from all owners to merge changes to this file.

### tsconfig.app.json

This is the base tsconfig extended by apps within the project.

There are additional tsconfig.app.json's within apps which just overide this with the correct
files to include.

### tsconfig.spec.json

This is the base tsconfig for tests.

There are additional tsconfig.spec.json's within apps which just overide this with the correct
files to include and extends the prod tsconfig for that project.

## App and Lib tsconfigs

## tsconfig.prod.json / tsconfig.lib.prod.json

This is the config used for builds and tests. This contains overrides for compiler options
from tsconfig.base.json that still fail on builds.

The overrides should be removed once the issues in the code related to the option are fixed.

## tsconfig.dev.json / tsconfig.lib.json

This is the config used for development. This contains overrides for compiler options to
disable options that are too strict for development.
