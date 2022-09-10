import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { FooterModule } from '@components/footer/footer.module';
import { NoSystemsModule } from '@components/no-systems/no-systems.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { SearchModule } from '@components/search/search.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { SystemCardModule } from '@components/system-card/system-card.module';
import { TagModule } from '@components/tag/tag.module';

import { NxSystemsListComponent } from './list.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
        ClientButtonModule,
        FooterModule,
        NoSystemsModule,
        SystemCardModule,
        TagModule,
        SearchModule
    ],
    declarations: [
        NxSystemsListComponent
    ],
    providers: [
        NxSystemsListComponent
    ],
    exports: [
        NxSystemsListComponent
    ]
})

export class SystemListModule { }
