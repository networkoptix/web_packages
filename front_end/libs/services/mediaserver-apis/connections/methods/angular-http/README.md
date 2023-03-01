Create a base abstraction for using angular http.

Look at the json-rpc implementation for an idea of what we're trying to do.

Should only handle request and responses.

We're not going to enforce interface compatibilty here but will instead do that through connection adapters.

For handling differences with authentication regimes between cloud portal and webadmin that will be handled within authentication handler classes.