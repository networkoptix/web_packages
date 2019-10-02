import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { Location, PathLocationStrategy, LocationStrategy, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';
import { WebStorageModule } from 'ngx-store';

import { IpvdComponent } from './ipvd.component';

// Components
import { NxCheckboxComponent } from '../app/src/components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '../app/src/components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '../app/src/components/content-block/section/section.component';
import { NxFooterComponent } from '../app/src/components/footer/footer.component';
import { NxGenericDropdown } from '../app/src/components/dropdowns/generic/dropdown.component';
import { NxMultiSelectDropdown } from '../app/src/components/dropdowns/multi-select/multi-select.component';
import { NxPreLoaderComponent } from '../app/src/components/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '../app/src/components/process-button/process-button.component';
import { NxSearchComponent } from '../app/src/components/search/search.component';
import { NxTagComponent } from '../app/src/components/tag/tag.component';
import { NxVendorListComponent } from '../app/src/components/vendor-list/vendor-list.component';

// Dialogs
import { MessageModalContent } from '../app/src/dialogs/message/message.component';

// Directives
import { NxArrowNavDirective } from '../app/src/directives/nx-arrow-nav';

// Ipvd page
import { NxIpvdComponent } from '../app/src/pages/ipvd/ipvd.component';
import { CamTableComponent } from '../app/src/pages/ipvd/cam-components/cam-table/cam-table.component';
import { CamViewComponent } from '../app/src/pages/ipvd/cam-components/cam-view/cam-view.component';
import { CsvButtonComponent } from '../app/src/pages/ipvd/cam-components/csv-button/csv-button.component';
import { BoolIconComponent } from '../app/src/pages/ipvd/cam-components/bool-icon/bool-icon.component';

// Services
import { WINDOWS_PROVIDERS } from '../app/src/services/window-provider';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        FormsModule,
        HttpClientModule,
        NgbModule,
        WebStorageModule,
        TranslateModule.forRoot(),
        RouterModule.forRoot([
            { path: '**', redirectTo: 'ipvd' },
            { path: 'ipvd', component: NxIpvdComponent }
        ], {
            initialNavigation: true,
            scrollPositionRestoration: 'enabled',
            anchorScrolling          : 'enabled',
            enableTracing            : false
        })
    ],
    entryComponents: [
        NxIpvdComponent
    ],
    providers: [
        Location,
        Title,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
    ],
    declarations: [
        IpvdComponent,
        MessageModalContent,
        NxCheckboxComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxFooterComponent,
        NxGenericDropdown,
        NxMultiSelectDropdown,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxSearchComponent,
        NxTagComponent,
        NxVendorListComponent,
        NxArrowNavDirective,
        NxIpvdComponent,
        CamTableComponent,
        CamViewComponent,
        CsvButtonComponent,
        BoolIconComponent,
    ],
    bootstrap: [
        IpvdComponent
    ]
})
export class IpvdPageModule {
    ngDoBootstrap() {
    }
}
