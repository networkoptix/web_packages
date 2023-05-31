import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxFileDropModule } from 'ngx-file-drop';

import { PipesModule } from '@pipes/pipes.module';

import { NxThirdPartyWidgetComponent } from './third-party-widget.component';

@NgModule({
    imports: [
        FormsModule,
        NgxFileDropModule,
        PipesModule
    ],
    declarations: [
        NxThirdPartyWidgetComponent
    ],
    providers: [
        NxThirdPartyWidgetComponent
    ],
    exports: [
        NxThirdPartyWidgetComponent
    ]
})

export class ThirdsPartyWidgetModule {}
