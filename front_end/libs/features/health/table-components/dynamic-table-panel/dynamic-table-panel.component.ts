import {
    AfterContentInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
} from '@angular/core';

import {
    InfoBlockSection,
    InfoBlockSections,
    InfoBlockLine,
} from '@components/info-block/info-block.component.types';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

import { NxHealthLayoutService } from '../../health-layout.service';
import { NxHealthService } from '../../health.service';

@Component({
    selector: 'nx-dynamic-table-panel-component',
    templateUrl: './dynamic-table-panel.component.html',
    styleUrls: ['./dynamic-table-panel.component.scss']
})
export class NxDynamicTablePanelComponent implements AfterContentInit {
    @Input() panelParams;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();

    name: string;

    windowSize: any = {};
    clientHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    sections: InfoBlockSections = [];

    @ViewChild('nxPanelView', { static: false }) nxPanelView: ElementRef;

    constructor(
        public healthService: NxHealthService,
        public healthLayoutService: NxHealthLayoutService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.name = '';
    }

    ngAfterContentInit(): void { // AfterViewInit causes detection change error
        this.healthLayoutService.activeEntitySubject.subscribe((activeEntity: any) => {
            this.scrollMechanicsService.panelVisible = true;
            this.name = activeEntity ? this.healthService.findEntityName(activeEntity) : '';
            if (this.panelParams && activeEntity) {
                const paramGroups = this.panelParams.values.filter(({ id }) => id !== '_');
                this.sections = paramGroups
                    .map(({ description, name, id: paramGroupId, values }) => {
                        const lines = values.map(({ id, name }) => new InfoBlockLine(
                            name || id,
                            (
                                (
                                    activeEntity[paramGroupId] &&
                                    activeEntity[paramGroupId][id] &&
                                    activeEntity[paramGroupId][id].text
                                ) || '_'
                            ),
                            (
                                activeEntity[paramGroupId] &&
                                activeEntity[paramGroupId][id] &&
                                activeEntity[paramGroupId][id].class
                            ),
                            (
                                activeEntity[paramGroupId] &&
                                activeEntity[paramGroupId][id] &&
                                activeEntity[paramGroupId][id].icon
                            ),
                            true,
                            (
                                activeEntity[paramGroupId] &&
                                activeEntity[paramGroupId][id] &&
                                activeEntity[paramGroupId][id].tooltip
                            )
                        ));
                        const maxParamWidthPercentage = 58;
                        return new InfoBlockSection(
                            lines,
                            description || name || paramGroupId,
                            maxParamWidthPercentage
                        );
                    });
            }
        });
    }

    closeView(): void {
        this.healthLayoutService.activeEntity = undefined;
        this.onCloseView.emit(undefined);
    }
}
