import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourService } from 'ngx-ui-tour-md-menu';

import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import {
    AddResourceType,
    EditResourceType,
    RemoveResourceType,
} from '@services/layout-grid/layout-grid.types';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { NxLayoutGridTreeComponent } from './layout-grid-tree.component';

describe('NxLayoutGridTreeComponent', () => {
    let component: NxLayoutGridTreeComponent;
    let fixture: ComponentFixture<NxLayoutGridTreeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NxLayoutGridTreeComponent],
            providers: [
                { provide: NxConfigService, useValue: { config: nxConfig } },
                {
                    provide: NxLayoutGridService,
                    useValue: {
                        addResource: () => new EventEmitter<AddResourceType>(),
                        editResource: () => new EventEmitter<EditResourceType>(),
                        removeResource: () => new EventEmitter<RemoveResourceType>(),
                        isLeftMenuOpen$$: () => false,
                    },
                },
                { provide: TourService, useValue: {} },
                { provide: LayoutStateService, useValue: {} },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NxLayoutGridTreeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
