import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, map } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

@Component({
    selector: 'nx-graphs',
    templateUrl: 'graphs.component.html',
    styleUrls: ['graphs.component.scss'],
})
export class GraphsComponent implements OnInit {
    system: NxSystem;
    selectedServerId$: Observable<string> = this.route.queryParamMap.pipe(
        map(paramMap => paramMap.get('serverId')),
    );

    constructor(
        private menuService: NxMenuService,
        private route: ActivatedRoute,
        private systemService: NxSystemService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'graphs';
        this.menuService.detail = '';
        this.system = this.systemService.getCurrentSystem();
    }
}
