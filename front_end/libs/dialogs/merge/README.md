This folder should contain all things related to Merge. There are some things that we'll need to check and/or update

**TODO:**
version testing:
    webadmin: check `5.2`
    cloud: check `4.2, 5.0, 5.1, 5.2`

~~1. We'll need to convert this to use the CDK instead of the dialog overlay~~

~~2. Test error codes. We want to move from `errorString` to `error` and make sure it's being mapped to the correct error message for both rest and legacy API. We'll use `MergeServerErrorCodes` and `MergeRestServerErrorCodes`, which are at the top of `merge.refactor.component.ts`. Eg:~~
    ```javascript
    const MergeServerErrorCodes = {
        1: 'noServerFound',
        2: 'wrongPassword',
        3: 'systemsIncompatible',
        10: 'differentOwners',
        13: 'duplicateServers',
    };

    const MergeRestServerErrorCodes = {
        2: 'wrongPassword',
        4: 'duplicateServers',
        11: 'noServerFound',
    };
    ````

    > Note: we may need to use a different system if there are too many errors for a single error number
    > - Potential error codes for rest are at: `/api-tool/main?version=current%20api`
    > - Potential error codes for legacy api are at: `/api/mergeSystems`
    

3. We should be able to press the process btn multiple times
    If the user presses the button while it's processing, then it will stop the previous process and restart the process altogether

~~4. We need to investigate local primary, cloud secondary
    One particular area of the code to look is the comment in `processSystems()` from `select-system.component.ts` in the `if (this.isLocal)` section.~~

~~5. Verify that `otherSystem` (boolean) works properly~~
~~    We haven't fully tested how that should get handled within the whole merge process~~

~~6. Merge dialog should be keyboard navigable~~
~~    - Should be able to get to inputs and buttons on each dialog~~
~~    - Initial focus will be on the input when moving forward/back within the dialog. This is why `.focus()` and `.markAsUntouched()` are being commented throughout the code~~

7. `serverUrl` validation
    - Higher priority: not checking before touched
    - Lower priority: able to show url validation if a bad url gets automatically shown. This is related to remoteAddresses being weird, with systemId.serverId's
    - Note: I haven't been able to reproduce this issue. If it comes up, we'll come back to address this

8. Investigate generic component's Process/History is done properly
    Supposed to be used for Section 4.7 of the spec, but wasn't tested

~~9. Finish typing everything~~

~~10. Mixins for repetitive CSS~~

***

**Future TODO:**
1. Turn `modal-footer` into a component

~~2. Look into using `this.system.useRest` instead of `this.system.isSessionOauth`~~

~~3. Const variable for magic strings (keep it inside of `merge.refactor.component.ts`)~~

***

**Notes:**
1. dryRunAvailable (applicable to both Webadmin and Cloud)
    - `true` means that various checks can be made during the process about whether systems are mergeable
    - `false` means that only merge setup can be done and whether systems are mergeable can only be checked at the very last step (no checking state necessary for "system selection")

2. We know that merge is happening when mergeInfo !== undefined (on system object --> gets checked in `systems.service.ts`)
    Need to figure out the best place to be doing such checks, currently being done in systems service + settings component

3. List of systems: cloud systems, auto-discovered systems, Other Systems (manual input)
    - Webadmin: no 1st section of Cloud Systems, though cloud systems can exist inside auto-discovered
    - Cloud: no "Other Systems" or auto-discovered systems

4. Different types of merges
    - On Cloud Portal (Cloud)
        Cloud with Cloud
    - On Webadmin (auto-discovered + Other Systems)
        auto-discovered systems wiill show cloud & local systems (look into if we label cloud systems as "cloud")
    - When primary is Cloud:
        Cloud with Cloud // server should give an error message that we should handle
        Cloud with local
    - When primary is Local:
        Cloud with local (designates the primary system to the cloud system automatically with no ability to do otherwise)
        local with local

5. Don't put anything on system object, only for post-merge
    - Relies on:
        1. checking `mergeInfo` in systems service
        2. `checkMergeStatus` in `settings.component.ts`
        3. `mergeInfo` shared in `this.close(msg)` with `admin.component.ts` that gets added to system object

6. Should not pre check for status until the check merge stage
    - Only certain statuses can be shown (ie online/offline). This done by using the `getSystemInfo` in `setTargetSystem` of `select-system.component.ts`

7. Different states
    - Current system does not support cloud merge
    - Select other system to merge with (if checking available, shows error messages about why it's not mergeable)
        1. Cloud: shows only other cloud systems
        2. Webadmin: shows list of auto-discovered systems + Other System options
            - Server url input only for webadmin
            - Server not found special error dialog?
    - (webadmin only) admin password
    - Choose primary system
        1. (webadmin only) if a local system tries to merge with cloud system, cloud system is automatically chosen as primary
    - Confirm merge before it starts
    - ????? 4.6 password confirmation (cloud and webadmin different?)
    - ????? 4.7 error when trying to merge? when is this supposed to occur?
    - 6.3 errors during merge

8. Primary/Secondary states while merging might not work if system object is significantly refactored

9. For Post merge states, we'll need to remove reliance on `errorString`: different languages have different errorStrings

10. System object needed for:
    - get it from settings.component.ts when creating merge dialog
    - get `dryRunAvailable` from `system.info.capabilities.merge_systems`
    - get `canMerge` from `system.canMerge`
    - initially set `primarySystem`/`primaryName` from system
    - get modulInfo from `system.serverManager.getModuleInfo()`
    - getPeerSystems from `system.getPeerSystems()`
        Fields used:
            - Funcs:
                `getPeerSystems(), serverManager.getModuleInfo(), update(), getRemoteServerInfo() [webadmin], getModuleInfoUsingUrl() [webadmin], mergeSystems, getMediaServers`
            - Existing:
                `info.capabilities.merge_systems, canMerge, moduleInfo.cloudOwnerId, useRest, stateOfHealth, info.stateOfHealth, status, isOnline, isAvailableremoteAddresses, name, info.name, port, mediaserver.isSessionOauth`
            - Added:
                `protoVersion`

11. Systems:
    - Get it from `settings.component.ts` when creating merge dialog
        Fields used:
            - Existing: stateOfHealth
            - Added: status, protoVersion, moduleInfo

12. TargetSystem:
    - `TargetSystem` is a `DropdownItem<string>` if "other system"
    - One of the `systems || peerSystems + value: system.id`
    - Has to set default system on load (checks mergeability)
    - Checks for id || `localSystemId` in `preCheckSystemMerge`
        Fields used
            - Existing: moduleInfo (retrieved), isOnline, isAvailable, systemName, cloudSystemId
            - Added: protoVersion (from moduleInfo)

13. primarySystem needed for:
    - Initially set as system from `settings.component.ts`
    - StateOfHealth and primaryName determined either from obj or from info obj
    - Set by comparing system ids

14. secondarySystem needed for:
    - Initially set as targetSystem
    - IsNew set using serverFlags + id needed to set system as primary/secondary

15. processedSystems:
    - Modified DropdownItem: value, name, help, peer (peer should no longer be needed, since serverUrl only pops up in webadmin now)
    - Add status to the name
    - Has horizontal line as option
    > should be processed inside select-system component

16. targetSystemDropdown
    - `DropdownItem`, same as `processedSystems`
    > should be created inside the select-system component

17. peerSystems:
    - Filter out current system
    - Add list of ips to `systemUrls` from `peer.remoteAddresses`
    - Determine if peer is a new system using `peer.serverFlags`
    - Create peer `obj + cleanIp, url, systemName, name, discoveredPeer:boolean, ip, isNew`
        Fields used:
            - Existing: `remoteAddresses, serverFlags, id, port, name, status, protoVersion, cloudOwnerId`
            - Added: `discoveredPeer, url, ip (cleaned), systemName (potentially edited), isNew`
    - `systemName` only in auto discovered systems (comes in ModuleInformation)
