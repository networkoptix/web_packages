This will contain the new versions of our mediaserver api classes.

The class definitions should contain almost no logic. Should just compose authentication, connection, endpoints, and mixins.

The mixins will be for code that doesn't belong on the authentication, connection, and endpoints classes. This is code that needs to be refactored of the mediaserver api.
