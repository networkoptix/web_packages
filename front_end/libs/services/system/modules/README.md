# Overview

All code from the original NxSystem class has been moved to NxSystemOldModule. The goal is to eventually replace this module completely with classes derived from NxSystemModuleBase that handle a single responsibility.

For modules that aren't dependent on a system instance being a specific version they should go in the libs/services/system/modules/common folder. These will be moduled derived directly from NxSystemModuleBase. An example would be a system info module that just contains data from Cdb.

For modules that are swappable by system version or capabilities. These should be on their own folder and should have their own abstract base class that extends NxSystemModuleBase to enforce api compatibilty.

How locked down the abstract base classes are would depend on variability we want to allow between derived classes.

An example of a class type that we'd want to lock down to an exact public interface would be an NxAuthentication abstract base class; there are several ways to authenticate based on version and environment but we'd like to be able to use without asserting which is bound to a system instance.

An example of a class type that we'd want to allow a degree of variation would be an NxMediaserver abstract base class; there are methods that are only available on certain versions and we'd want to enforce that the type has been sufficiently narrowed before certain methods are accessed.

## Initial plans for modules
This will probably be revised as we start breaking off modules but here's the general idea of how we want the modules structured.

- **System Module Info**: This will contain the most basic information about the system. Mostly static data from cloud db and/or the moduleInfo for the system.
- **Capabilities/Features**: Not sure about this one yet but it might be useful if we're able to implement a type safe way to conditionally include modules based on the system capabilities/features.
- **System State Info**: This will contain more dynamic information about the system. Ideally we should avoid keeping state in properties but lean on using observables.
- **Authentication**: This should be an abstract base class to enforce that the actual implementations are swappable.
    - **Cloud Portal**: Should handle authentication for cloud portal.
    - **Webadmin**: Should handle authentication for webadmin
    - **Legacy**: Should handle authentican for legacy systems.
- **Mediaserver Api**: We probably don't want an abstract base class for these because implementations don't have to be swappable. We'll eventually refactor the api classes and move them to libs/services/mediaserver-apis. For now we could use the existing classes as is.
    - **Legacy**: Eventually include the legacy endpoints instead of how we include rest endpoints but they all throw errors.
    - **Rest V1**: Should include rest endpoints V1; we're trying to avoid legacy endpoints going forward. If any are still needed they should be included as a separate mixin for rest systems. For 5.0 systems.
    - **Rest V2**: Should include rest endpoints V2. For 5.1 systems.
    - **Rest V3**: Should include rest endpoints V3. For 5.2 systems.
- **Resource Managers**: The resource managers will need to be refactored to not rely on being passed a concrete `this`. Instead we should explicitely pass the properties/methods it was using from `this`.
    - **Camera Manager**
    - **Server Manager**
    - **Storage Manager**
    - **Cloud Storage Manager**
    - **User Manager**
    - **User With Groups Manager**
    - **LicenseManager**
