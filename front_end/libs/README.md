This is where all shared code will be kept. Libaries in this folder should be buildable and as small as possible to allow for aggressive caching.

Exceptions would be modules that are less commonly changed, or almost always included together.

Examples of exceptions would be core components and services which could each contain many components/services.