import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, DebugElement, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

import { NxDevConsoleComponent } from './console.component';

@Component({
    selector: 'nx-console-menu',
    template: '<div></div>',
})
class MockConsoleMenu {
    @Input() menu;
    @Input() base;
    @Input() type;
    @Input() sectionParam;
}

@Component({
    selector: 'nx-console-edit',
    template: '<div></div>',
})
class MockConsoleEdit {
    @Input() contextList;
    @Input() asset;
}

@Component({
    selector: 'nx-console-table',
    template: '<div></div>',
})
class MockConsoleTable {
    @Input() sectionParam;
    @Input() contextList;

    @Output() editValues = new EventEmitter();
}

describe('NxDevConsoleComponent', () => {
    let component: NxDevConsoleComponent;
    let fixture: ComponentFixture<NxDevConsoleComponent>;
    let el: DebugElement;
    const configMock = { config: nxConfig };
    const expectedSection = 'custom-clients';
    const expectedMode = 'edit';
    const expectedId = uuid();
    const expectedMenu = [
        {
            url: uuid(),
            title: uuid(),
            icon: uuid(),
        },
    ];
    const contexts = expectedMenu.map(({ url: name, title: label, icon }) => ({
        name,
        label,
        icon,
        fields: [],
        global: false,
    }));
    const routeMock = {
        params: new BehaviorSubject({
            section: expectedSection,
            mode: expectedMode,
            id: expectedId,
        }),
    };
    const mockManifest = { manifest: { contexts } };
    const cloudMock = {
        getSubAPI: () => ({
            getManifest: () => of(mockManifest),
        }),
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxDevConsoleComponent,
                MockConsoleEdit,
                MockConsoleTable,
                MockConsoleMenu,
            ],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: ActivatedRoute, useValue: routeMock },
                {
                    provide: Router,
                    useValue: { url: '', navigateByUrl: () => {} },
                },
                { provide: NxCloudApiService, useValue: cloudMock },
                {
                    provide: NxHeaderService,
                    useValue: {
                        currentLocation: { parentNode: { nodes: [] } },
                        setLocation: () => {},
                    },
                },
            ],
            imports: [CommonModule, HttpClientTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(NxDevConsoleComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;
        fixture.detectChanges();
    }));

    it('should create NxDevConsoleComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should load for correct section', () => {
        expect(component.sectionParam).toBe(expectedSection);
    });

    it('should load for correct mode', () => {
        expect(component.selectedMode).toBe(expectedMode);
    });

    it('should set correct base route', () => {
        expect(component.base).toBe(`/developers/${expectedSection}/${expectedMode}/${expectedId}`);
    });

    it('should get correct manifest', () => {
        expect(component.manifest).toBe(mockManifest);
    });

    it('should get correct menu context', () => {
        expect(component.menu).toEqual(expectedMenu);
    });

    it('should always render menu component', () => {
        expect(el.nativeElement.querySelector('nx-console-menu')).toBeTruthy();
    });

    it('should render edit component when in edit mode', () => {
        expect(el.nativeElement.querySelector('nx-console-edit')).toBeTruthy();
    });

    it('should not render table component when in edit mode', () => {
        expect(el.nativeElement.querySelector('nx-console-table')).toBeFalsy();
    });

    it('should not render edit component when not in edit mode', () => {
        component.selectedMode = null;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('nx-console-edit')).toBeFalsy();
    });

    it('should render table component when not in edit mode', () => {
        component.selectedMode = null;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('nx-console-table')).toBeTruthy();
    });
});
