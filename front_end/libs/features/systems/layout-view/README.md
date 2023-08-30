# Home

## Overview

Epic: https://networkoptix.atlassian.net/browse/CLOUD-11185

## Todo

### Features:
- [ ] Create independent observables for Layouts, Cameras, ...
- [ ] Add selected camera prop to camera preview and Layouts View

### Minor Tasks
- [x] Check and fix camera rotation on layouts and camera preview
- [x] System Navigation Top Menu is briefly visible in full when navigating to layouts
- [x] Tree control track by in layout-grid should use id
- [ ] Ellipsis causes text to vanish while editing
- [ ] Esc from the newly created Layout edit mode should delete it. Add tests
- [ ] Validation for a unique layout name. Should be discussed
- [ ] Editing state should be moved to a separate store
- [ ] Quality of life - new layout name generator should account for available numbers \["New", "New 2"] => add layout => \["New", "New 1", "New 2"]
- [ ] CdkMenu: change it entirely OR add global styling or a story to add global styling
- [ ] Investigate performance issue and trackBy function behavior. Classic way of applying it does not work with treeControl trackBy
