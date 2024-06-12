This folder will contain complete apps at the root and features(previously pages) will be in the features' folder.

Apps will eventually be refactored to have the following architecture.

App Shell > Features > Shared Library Code

Features should be decoupled from the apps that they're included to allow portability as well as allow them to be cachable.