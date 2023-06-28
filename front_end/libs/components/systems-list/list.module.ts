import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { SearchModule } from '@components/search/search.module';
import { SystemCardModule } from '@components/system-card/system-card.module';
import { TagModule } from '@components/tag/tag.module';

import { NxSystemsListComponent } from './list.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NxClientButtonComponent,
        NxFooterComponent,
        NxNoSystemsComponent,
        NxPreLoaderComponent,
        SystemCardModule,
        SearchModule,
        TagModule,
    ],
    declarations: [NxSystemsListComponent],
    providers: [NxSystemsListComponent],
    exports: [NxSystemsListComponent],
})
export class SystemListModule {}
