import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TagModule } from '@components/tag/tag.module';
import { TooltipModule } from '@components/tooltip/tooltip.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxPasswordTagValidationComponent } from './password-tag-validation.component';

@NgModule({
    imports: [
        CommonModule,
        DirectivesModule,
        TranslateModule,
        PipesModule,
        TooltipModule,
        TagModule,
    ],
    declarations: [
        NxPasswordTagValidationComponent
    ],
    providers: [
        NxPasswordTagValidationComponent
    ],
    exports: [
        NxPasswordTagValidationComponent
    ]
})

export class PasswordTagValidationModule {}
