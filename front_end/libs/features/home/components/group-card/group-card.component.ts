import { CdkMenuModule } from '@angular/cdk/menu';
import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@common/language/language_i18n_static.json';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import type { GroupItem } from '../../home.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

@Component({
    selector: 'nx-group-card',
    templateUrl: 'group-card.component.html',
    styleUrls: ['../system-card/system-card.component.scss', 'group-card.component.scss'],
    standalone: true,
    imports: [CdkMenuModule, NxSearchHighlightComponent, AngularSvgIconModule],
})
export class NxGroupCardComponent {
    @Input() group: GroupItem;
    @Input() search: string = '';

    LANG = staticLang;
    icons = icons;

    constructor(
        private router: Router,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
    ) {}

    openGroup(): void {
        this.router.navigate(['group', this.group.id], {
            relativeTo: this.route.parent,
        });
    }

    deleteGroup(): void {
        this.groupsService.deleteGroup(this.group.id);
    }

    addGroup(): void {
        this.dialogsService.createSystemGroup({
            targetId: this.group.id,
            hasGroups: true,
            parentGroup: this.group.name,
        });
    }
}
