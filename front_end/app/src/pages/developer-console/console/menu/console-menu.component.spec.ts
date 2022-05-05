import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { v4 as uuid } from 'uuid';

import { ConsoleMode } from '@pages/developer-console/console/console.types';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxMenusService } from '@services/menus.service';

import { NxDevConsoleMenuComponent } from './console-menu.component';

describe('NxDevConsoleMenuComponent', () => {
    let component: NxDevConsoleMenuComponent;
    let fixture: ComponentFixture<NxDevConsoleMenuComponent>;
    let el: DebugElement;
    const configMock = { config: nxConfig };
    const menuMock = [...Array(
        Math.round(Math.random() * 20) + 1
    )].map(_ => ({
        title: uuid(),
        url: uuid(),
        icon: uuid()
    }));
    const menusMock = {
        getMenu: () => ({
            subscribe: () => { }
        })
    };

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [
                    NxDevConsoleMenuComponent
                ],
                imports: [
                    CommonModule,
                    TranslateModule.forRoot(),
                    AngularSvgIconModule.forRoot(),
                    HttpClientTestingModule,
                    RouterTestingModule
                ],
                providers: [
                    { provide: NxConfigService, useValue: configMock },
                    { provide: NxMenusService, useValue: menusMock }
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxDevConsoleMenuComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;
        fixture.detectChanges();
    }));

    it('should create NxDevConsoleMenuComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should not show content heading when not in edit mode', () => {
        component.loading = false;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('h3')).toBeFalsy();
    });

    it('should show content heading when edit mode', () => {
        component.loading = false;
        component.type = ConsoleMode.EDIT;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('h3').innerText).toEqual(
            'Content');
    });

    it('should not show additional links by default', () => {
        component.loading = false;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('.additional-links')).toBeFalsy();
    });

    it('should show additional links when edit mode and showAdditionalLinks is true', () => {
        component.loading = false;
        component.type = ConsoleMode.EDIT;
        component.showAdditionalLinks = true;
        fixture.detectChanges();
        const links = el.nativeElement.querySelector('.additional-links');
        expect(links).toBeTruthy();
        expect(links.firstElementChild.innerText).toEqual('Show Preview');
        expect(links.lastElementChild.innerText).toEqual('Version Control');
    });

    it('should not display context menu if not edit mode', () => {
        component.loading = false;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector(`.${ConsoleMode.EDIT}`)).toBeFalsy();
    });

    it('should display context menu when loaded in edit mode', () => {
        component.menu = menuMock;
        component.type = ConsoleMode.EDIT;
        component.loading = false;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector(`.${ConsoleMode.EDIT}`)).toBeTruthy();
    });

    it('should display the correct menu items', () => {
        component.menu = menuMock;
        component.type = ConsoleMode.EDIT;
        component.loading = false;
        fixture.detectChanges();
        const nodes = [...el.nativeElement.querySelector(
            `.${ConsoleMode.EDIT}`).children];
        nodes.forEach((
            { innerText }, index
        ) => expect(innerText).toEqual(
            menuMock[index].title));
    });
});
