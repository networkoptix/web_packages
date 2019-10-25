import {
    Component, Input, Output, EventEmitter,
    OnChanges, SimpleChanges,
    OnInit, ViewEncapsulation, Inject, PLATFORM_ID
}                                                         from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NxConfigService }                                from '../../../../services/nx-config';
import { NxUtilsService }                                 from '../../../../services/utils.service';
import { NxUriService }                                   from '../../../../services/uri.service';

@Component({
    selector     : 'nx-single-entity',
    templateUrl  : './single-entity.component.html',
    styleUrls    : ['./single-entity.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxSingleEntityComponent implements OnChanges{
    @Input() params: any;
    @Input() entity: any;

    CONFIG: any = {};

    constructor(private configService: NxConfigService,
                private utilsService: NxUtilsService) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnChanges(changes) {
        console.log(this.entity);
    }
}
