import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { FooterModule } from '@components/footer/footer.module';
import { NoSystemsModule } from '@components/no-systems/no-systems.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SearchModule } from '@components/search/search.module';
import { SystemCardModule } from '@components/system-card/system-card.module';
import { TagModule } from '@components/tag/tag.module';

import { NxSystemsListComponent } from './list.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        ClientButtonModule,
        FooterModule,
        NoSystemsModule,
        PreLoaderModule,
        SystemCardModule,
        SearchModule,
        TagModule,
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
