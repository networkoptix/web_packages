We need to break the coupling with api classes. Currently with the way we inherit legacy -> Rest V1 -> Rest V2 -> Rest V3. There's no type safe way to determine which methods are active/deprecated/removed per VMS version.

Before we can break the coupling we need to move the method definitions to their own functions that could be used to compose a class.

Ideally at the end, api versions won't include methods that aren't available for that version. Deprecated methods would be noted with JSDoc and methods that aren't available will be totally removed.

Intial adapters for the connection classes should be api compatible with the current get/post methods so we'll keep the type signatures as is.

Any methods are aren't just a staight call to get/post or that does anything more than provide some default params should be left as is. Those should eventually be moved out of the api classes.

The api classes should only be concerned with what endpoints the can use, connection, authentication, and processing shouldn't exist in this class.

Each file should contain one endpoint. Multiple definitions for that endpoint could exist, an example would be if the response type changes between V2 and V3 of an api.