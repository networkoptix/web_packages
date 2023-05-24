import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, map } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

@Component({
    selector: 'nx-logs',
    templateUrl: 'logs.component.html',
    styleUrls: ['logs.component.scss'],
})
export class LogsComponent implements OnInit {
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
        this.menuService.section = 'logs';
        this.menuService.detail = '';

        this.system = this.systemService.getCurrentSystem();
    }
}
