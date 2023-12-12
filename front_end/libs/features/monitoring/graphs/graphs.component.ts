import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, map } from 'rxjs';

import { NxMenuService } from '@menu/menu.service';
import { NxSystem } from '@services/system.service/system';

@Component({
    selector: 'nx-graphs',
    templateUrl: 'graphs.component.html',
    styleUrls: ['graphs.component.scss'],
})
export class GraphsComponent implements OnInit {
    @Input() system: NxSystem;
    selectedServerId$: Observable<string> = this.route.queryParamMap.pipe(
        map(paramMap => paramMap.get('serverId')),
    );

    constructor(
        private menuService: NxMenuService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.menuService.selectedSection.set('graphs');
        this.menuService.selectedDetailsSection.set('');
    }
}
