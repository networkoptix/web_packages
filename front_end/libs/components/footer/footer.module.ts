import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxFooterComponent } from './footer.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        PipesModule,
        DirectivesModule,
    ],
    declarations: [NxFooterComponent],
    providers: [NxFooterComponent],
    exports: [NxFooterComponent],
})
export class FooterModule {}
