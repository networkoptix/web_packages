import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxTagComponent } from '@components/tag/tag.component';
import { NxFilterTagsComponent } from '@components/tag-filter/tag.component';
import { UserFilter } from '@dialogs/channel-partners/filter-users/filter-users.types';
import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'tags',
    templateUrl: 'tags.component.html',
    styleUrls: ['tags.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, TranslateModule, NxTagComponent, NxFilterTagsComponent],
})
export class TagsComponent {
    options: { name: string; selected: boolean; type?: string }[];
    filters: UserFilter[];

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('tags');

        this.options = [
            { name: 'brand', selected: false, type: 'brand' },
            { name: 'really long name break', selected: false, type: 'brand' },
            { name: 'success', selected: false, type: 'success' },
            { name: 'danger', selected: false, type: 'danger' },
            { name: 'warning', selected: false, type: 'warning' },
            { name: 'info', selected: false, type: 'info' },
            { name: 'default', selected: false },
        ];

        this.filters = [
            { group: 'email', value: 'john.goe@test.com', selected: true, id: 'john.goe@test.com' },
            { group: 'name', value: 'John Doe', selected: true, id: 'John Doe' },
            { group: 'name', value: 'Jane Doe', selected: true, id: 'Jane Doe' },
        ];
    }

    addMoreFilters(): void {
        this.filters.push(
            { group: 'email', value: 'jane.doe@test.com', selected: true, id: 'jane.doe@test.com' },
            { group: 'email', value: 'ice-t@test.com', selected: true, id: 'ice-t@test.com' },
            { group: 'name', value: 'Ice T', selected: true, id: 'Ice T' },
        );
    }
}
