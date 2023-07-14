import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, map } from 'rxjs';

import { NxMenuService } from '@menu/menu.service';
import { NxSystem } from '@services/system.service/system';

@Component({
    selector: 'nx-logs',
    templateUrl: 'logs.component.html',
    styleUrls: ['logs.component.scss'],
})
export class LogsComponent implements OnInit {
    @Input() system: NxSystem;
    selectedServerId$: Observable<string> = this.route.queryParamMap.pipe(
        map(paramMap => paramMap.get('serverId')),
    );

    constructor(private menuService: NxMenuService, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.menuService.selectedSection.set('logs');
        this.menuService.selectedDetailsSection.set('');
    }
}
