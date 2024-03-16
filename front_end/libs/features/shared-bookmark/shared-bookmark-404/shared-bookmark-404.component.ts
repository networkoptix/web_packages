import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-shared-bookmark-404',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['shared-bookmark-404.component.scss'],
    templateUrl: 'shared-bookmark-404.component.html',
    imports: [TranslateModule, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class SharedBookmark404Component {
    icons = icons;
}
