import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PipesModule } from '@app/pipes/pipes.module';

import { WizardModalContent } from './wizard.component';

@NgModule({
    imports: [CommonModule, PipesModule],
    declarations: [WizardModalContent],
    providers: [],
    exports: [WizardModalContent],
})
export class NxWizardModalModule {}
