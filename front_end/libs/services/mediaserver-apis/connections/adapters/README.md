Adapters allow composing classes to remove coupling between a mediaserver class and a concrete connection class.

This will allow us to incrementally refactor parts of the system monolith.

Initial adapters should only expose methods mapped to HTTP methods get, post, put, patch, and delete.