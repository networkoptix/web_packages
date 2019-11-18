import {Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import { NxConfigService }                                from '../../../../services/nx-config';
import { NxUtilsService }                                 from '../../../../services/utils.service';
import { NxHealthService } from '../../health.service';

@Component({
    selector     : 'nx-single-entity',
    templateUrl  : './single-entity.component.html',
    styleUrls    : ['./single-entity.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxSingleEntityComponent implements OnInit {
    @Input() params: any;
    @Input() entity: any;

    CONFIG: any = {};
    copyParams: any;
    entityName: string;

    constructor(private configService: NxConfigService,
                private healthService: NxHealthService,
                private utilsService: NxUtilsService) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        this.copyParams = {...this.params};
        this.copyParams.values = this.copyParams.values.filter((value) => value.id !== '_');
        if ('_' in this.copyParams) {
            delete this.copyParams['_'];
        }
        this.entityName = this.healthService.findEntityName(this.entity);
    }
}
