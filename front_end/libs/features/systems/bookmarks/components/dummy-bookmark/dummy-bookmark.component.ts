import { Component } from '@angular/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';

@Component({
    selector: 'nx-dummy-bookmark',
    standalone: true,
    imports: [NxPreLoaderComponent],
    templateUrl: './dummy-bookmark.component.html',
    styleUrls: ['./dummy-bookmark.component.scss'],
})
export class DummyBookmarkComponent {}
