import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';

import { NxReportsSidebarComponent } from './reports-sidebar/reports-sidebar.component';

@Component({
    selector: 'nx-reports',
    templateUrl: 'reports.component.html',
    styleUrls: ['reports.component.scss'],
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        FormsModule,
        TranslateModule,
        RouterModule,
        NxReportsSidebarComponent,
    ],
    hostDirectives: [NxThemeAttributeDirective],
    standalone: true,
})
export class NxReportsComponent implements OnInit {
    private appStateService = inject(NxAppStateService);
    private headerService = inject(NxHeaderService);

    ngOnInit(): void {
        this.appStateService.ready = true;
        this.headerService.cycleL2Menu$.next();
    }
}
