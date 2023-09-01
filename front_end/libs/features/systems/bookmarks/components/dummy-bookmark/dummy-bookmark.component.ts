import { Component } from '@angular/core';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

@Component({
    selector: 'nx-dummy-bookmark',
    standalone: true,
    imports: [PreLoaderModule],
    templateUrl: './dummy-bookmark.component.html',
    styleUrls: ['./dummy-bookmark.component.scss'],
})
export class DummyBookmarkComponent {}
