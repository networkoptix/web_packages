import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ClipComponent } from '@components/clip/clip.component';
import { NxPlayerPlaceholderComponent } from '@components/placeholders/player/player-placeholder.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';

import { NxBookmarksCardModalComponent } from './bookmarks-card-modal.component';

@NgModule({
    declarations: [NxBookmarksCardModalComponent],
    providers: [],
    exports: [NxBookmarksCardModalComponent],
    imports: [
        AngularSvgIconModule,
        CommonModule,
        ClipComponent,
        NxProcessButtonComponent,
        TranslateModule,
        NxPlayerPlaceholderComponent,
    ],
})
export class NxBookmarksCardModalModule {}
