# Home

## Overview

Home is broken down into **3** categories;
1. ### Channel Partners ( Majority of the feature )
  - Partners are also broken down into **2** further subsets:
    1. Organizations
    2. Groups

  - **NOTE**: Header is dynamic and will show all of the user's channel partners
  - #### Organizations
    - Contain their own set of users w/ roles and may contain groups and systems
  - #### Groups
    - Subsets inside of organizations that store systems, with users w/ roles populated directly from the parent organization
2. ### Shared Systems
  - Systems shared with you and reside at the root level ( Systems **NOT** connected to Channel Partners/Organizations/Groups )
3. ### Personal Systems
  - Systems owned by you and reside at the root level


## Todo

### Features:
- [ ] Search for Organizations/Groups/Systems in their respective components
  - [ ] Change behavior for `systems.component.ts` by removing the  double for loop before wiring the search
- [ ] Update entirety with new Angular 16 features
- [ ] Placeholder for no systems in organization
- [ ] Placeholder for no subchannel partners
- [ ] Update sidebar to show nested groups within organizations

### Minor Tasks
- [ ] Remove organization nodes from the header ?
- [ ] Update preloader logic for components ( currently displays overlaying preloader in between navigations )
- [ ] Role Resolver / Tab Guard is a bit funky with the way that data is stored / handled by resolvers and guards
- [ ] Add real time support for adding subchannels ( currently requires refresh to show new subchannels )
- [ ] Convert resolvers from classes to functional resovlers
- [ ] Add memoization for to Channel Partners API