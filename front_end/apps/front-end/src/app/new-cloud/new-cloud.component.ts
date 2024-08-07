import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxApplyComponent } from '@components/apply/apply.component';
import { NxHeaderComponent } from '@components/header/header.component';
import { NxNavFooterComponent } from '@components/nav-footer/nav-footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastContainerModule } from '@components/toast-container/toast-container.module';
import { NxTourStepComponent } from '@components/tour-step/tour-step.component';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxLayoutComponent } from 'nx-components';

require('what-input');

@UntilDestroy()
@Component({
    selector: 'nx-new-cloud',
    template: `<nx-layout
        class="preserve-font"
        layoutType="wrapper"
        (drawerWidthChange)="setDrawerWithCssVariable($event)"
    >
        <ng-container main>
            <router-outlet></router-outlet>
        </ng-container>
        <ng-container notifications>
            <nx-app-toasts />
        </ng-container>
        <ng-container secondaryMenuModal>
            <div class="header-wrapper"><nx-header /></div>
        </ng-container>
    </nx-layout>`,
    styleUrls: ['./new-cloud.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        RouterModule,
        NxNavFooterComponent,
        NxTourStepComponent,
        NxApplyComponent,
        NxResizeObserver,
        NxLayoutComponent,
        ToastContainerModule,
        NxHeaderComponent,
    ],
})
export class NewCloudAppComponent {
    setDrawerWithCssVariable(value: string): void {
        document.documentElement.style.setProperty('--drawer-width', value);
    }
}
