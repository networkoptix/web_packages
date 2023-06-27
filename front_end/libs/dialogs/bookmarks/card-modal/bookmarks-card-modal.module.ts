import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ClipComponent } from '@components/clip/clip.component';
import { PlayerPlaceholderModule } from '@components/placeholders/player/player-placeholder.module';

import { ProcessButtonModule } from '../../../components/process-button/process-button.module';

import { NxBookmarksCardModalComponent } from './bookmarks-card-modal.component';

@NgModule({
    declarations: [NxBookmarksCardModalComponent],
    providers: [],
    exports: [NxBookmarksCardModalComponent],
    imports: [
        AngularSvgIconModule,
        CommonModule,
        ClipComponent,
        ProcessButtonModule,
        TranslateModule,
        PlayerPlaceholderModule,
    ],
})
export class NxBookmarksCardModalModule {}
