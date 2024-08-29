*Last Updated: 8/27/2024*

## SAAS Services Reports V1

### Feature Overview

This feature includes pages to view SAAS services reports in Cloud Portal. Here users can view reports related to usage of system services in their channel partners/organizations.

- **Specification:** https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2996142086/SaaS+Reports
- **Service changes design:** https://www.figma.com/design/o0rIklvaLhnV91RTaEus7C/CP?node-id=1039-96018&t=bOAmFVedcmYlMWfB-1
- **Service usage design:** https://www.figma.com/design/o0rIklvaLhnV91RTaEus7C/CP?node-id=15026-215523&t=bOAmFVedcmYlMWfB-1
- **Service changes JIRA epic:** https://networkoptix.atlassian.net/browse/CLOUD-12102
- **Service usage JIRA epic:** https://networkoptix.atlassian.net/browse/CLOUD-11416
- **Channel partners API:** https://cloud-test.hdw.mx/partners/api/api-docs/



Main pages/components for this feature:

- **Service Changes page**
- **Service Usage page**
  - *click regular service row* -> **Regular Service Usage Details page**
    - *click any table row* -> **Regular Service Details dialog**
  - *click expiring service row* -> **Expiring Service Usage Details page**
    - *click table row with multiple expirations* -> **Expiring Service Details dialog**
- **Reports Sidebar** - expandable nested directory tree for viewing/selecting channel partners and orgs



Contributors:

- **Design** - Ivan
- **Dev (frontend)** - Sean (most of UI), Andrew (month picker), Tsanko (UI bugs), Nick
- **Dev (backend)** - Kyrylo (CP endpoints), Kevin (channel_structure endpoint), Roman
- **QA** - Kamil, Iryna



### Architecture

1. **Files and folders**
   1. Most files/components for Reports are located under `front_end/libs/features/reports`
   2. The service details dialogs are located under `front_end/libs/dialogs/channel-partners`
      1. `view-expiring-service-details`
      2. `view-regular-service-details`
2. **Data flow**
   1. Each page has an [NgRx Signal Store](https://ngrx.io/guide/signals/signal-store) that contains logic for data fetching and state management:
      1. An Angular Effect in the component for the page calls `store.loadPartnerData()` or `store.loadOrgData()` depended on the selected entity type
         1. The effect listens for changes to date filter, entity, etc and re-calls the loadData method
      2. The store's loadData() methods fetch records from a Channel Partners API endpoint, and then the records are formatted and populated into a frontend table
3. **API pagination**
   1. `service-changes` store has logic to synchronize frontend table pagination with API pagination. API pagination was not added to the other pages/tables at this time for reasons described [here](https://networkoptix.atlassian.net/browse/CLOUD-14127). API pagination logic could be refactored to use Chris's implementation which was done in parallel (see Possibly Future Work below)
4. **UI Components**
   1. Other than the main pages, `front_end/libs/features/reports` also contains these components:
      1. `month-select`: base component class for pages that have a month picker
      2. `group-path`: builds/renders the group path for systems (eg "Group Name / Nested Group Name / System Name") that are shown in certain table columns
      3. `hidden-name-link`: when a user doesn't have permission to view an entity's name, we show a link with the text "Hidden Name" that copies to clipboard a url to that entity's usage report on click

5. **Data export**
   1. Service Usage page has XLSX and CSV data exports. The logic and components for export (loading status dialog, polling, download) are under `front_end/libs/features/reports/service-usage/report-export`. This folder could be moved under the root reports folder when export is added to Service Changes.

6. **Table styles**
   1. Styles for the reports tables live in the global `front_end/common/styles/common/_tables.scss`. CSS theme variables for reports are also here for reasons described [here](https://gitlab.nxvms.dev/dev/cloud_portal/-/merge_requests/8175#note_793806)



### Possible Future Work

- Service changes export - as of writing the API endpoint for this is under development
- Update API pagination to use `.withPageUpdater()` set up by Chris
  - https://gitlab.nxvms.dev/dev/cloud_portal/-/merge_requests/7991