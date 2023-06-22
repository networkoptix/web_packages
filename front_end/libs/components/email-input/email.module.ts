import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DirectivesModule } from '@directives/directives.module';

import { NxEmailComponent } from './email.component';

@NgModule({
    imports: [CommonModule, FormsModule, DirectivesModule],
    declarations: [NxEmailComponent],
    providers: [NxEmailComponent],
    exports: [NxEmailComponent],
})
export class EmailModule {}
