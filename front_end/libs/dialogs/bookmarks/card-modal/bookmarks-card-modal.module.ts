import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ClipModule } from '@components/clip/clip.module';

import { ProcessButtonModule } from '../../../components/process-button/process-button.module';

import { NxBookmarksCardModalComponent } from './bookmarks-card-modal.component';

@NgModule({
    declarations: [
        NxBookmarksCardModalComponent,
    ],
    providers: [],
    exports: [
        NxBookmarksCardModalComponent,
    ],
    imports: [
        AngularSvgIconModule.forRoot(),
        CommonModule,
        ClipModule,
        ProcessButtonModule
    ]
})
export class NxBookmarksCardModalModule {}
