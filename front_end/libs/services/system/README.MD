To break up the NxSystem monolith we're going to be following the strangler pattern to break off individual parts to be refactored.

The NxSystemBase and NxSystemModuleBase abstract classes should be as concise as possible. They're only responsiblity is extending functionality and asserting what modules an instance implements.

We will purposefully add the coupling between submodules depending on VMS version, environment (webadmin, cloud, or other), system capabilities, or enabled feature flags using factories.

The factories will take a class derived from NxSystemBase and NxSystemModuleBase classes.

For the initial stages we're just going to move all the code in the existing NxSystem class into an NxSystemOldModule.

This NxSystemOldModule is where we'll start breaking off sub modules.