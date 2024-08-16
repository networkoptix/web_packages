import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { ClipboardService } from 'ngx-clipboard';
import { map, startWith } from 'rxjs/operators';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { environment } from '@environments/environment';
import { PipesModule } from '@pipes/pipes.module';

@Component({
    selector: 'nx-oauth-builder',
    templateUrl: './oauth-builder.component.html',
    styleUrls: ['./oauth-builder.component.scss'],
    standalone: true,
    providers: [FormGroupDirective],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NxFormFieldModule,
        NxInputComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        PipesModule,
    ],
})
export class NxOauthBuilderComponent {
    protected readonly environment = environment;
    protected readonly defaultValues = {
        responseType: 'token',
        grantType: 'password',
        clientId: 'cloud_portal-default',
        clientType: 'loginCloud',
        viewType: 'web',
        email: '',
        systemName: '',
        scopeBuilder: '',
        redirectUrl: window.location.origin,
        cloudHost: window.location.origin,
    };
    protected readonly string: string;

    protected clipboardService = inject(ClipboardService);
    protected http = inject(HttpClient);

    private clientIdControl = new FormControl(this.defaultValues.clientId);
    private cloudHostControl = new FormControl(this.defaultValues.redirectUrl);
    private clientTypeControl = new FormControl(this.defaultValues.clientType);
    private viewTypeControl = new FormControl(this.defaultValues.viewType);
    private emailControl = new FormControl('', {
        nonNullable: true,
        validators: [...NxValidators.email()],
    });
    private systemNameControl = new FormControl('');
    private scopeBuilderControl = new FormControl('');
    private redirectUrlControl = new FormControl(this.defaultValues.redirectUrl);

    private responseTypeControl = new FormControl(this.defaultValues.responseType);
    private grantTypeControl = new FormControl(this.defaultValues.grantType);
    private scopeControl = new FormControl('');
    private usernameControl = new FormControl('', {
        nonNullable: true,
        validators: [...NxValidators.email()],
    });
    private passwordControl = new FormControl('');
    private codeControl = new FormControl('');
    private refreshTokenControl = new FormControl('');

    authConfigFormGroup = new FormGroup({
        cloudHost: this.cloudHostControl,
        clientId: this.clientIdControl,
        clientType: this.clientTypeControl,
        viewType: this.viewTypeControl,
        email: this.emailControl,
        systemName: this.systemNameControl,
        scopeBuilder: this.scopeBuilderControl,
        redirectUrl: this.redirectUrlControl,
    });
    loginFormGroup = new FormGroup({
        responseType: this.responseTypeControl,
        grantType: this.grantTypeControl,
        scope: this.scopeControl,
        username: this.usernameControl,
        password: this.passwordControl,
        code: this.codeControl,
        refreshToken: this.refreshTokenControl,
    });

    authUrl = toSignal(
        this.authConfigFormGroup.valueChanges.pipe(
            startWith(this.defaultValues),
            map(values => {
                const { clientId, clientType, cloudHost, redirectUrl, viewType } =
                    this.defaultValues;
                const params = new URLSearchParams({
                    client_id: values?.clientId || clientId,
                    client_type: values?.clientType || clientType,
                    view_type: values?.viewType || viewType,
                    redirect_uri: values?.redirectUrl || redirectUrl,
                });
                if (values?.email) {
                    params.append('email', values?.email);
                }
                if (values?.systemName) {
                    params.append('system_name', values?.systemName);
                }
                if (values?.scopeBuilder) {
                    params.append('scope', values?.scopeBuilder);
                }
                return `${values?.cloudHost || cloudHost}/authorize?${params.toString()}`;
            }),
        ),
    );

    oauthRequestBody = signal<Record<string, string> | null>(null);
    parsedToken = computed(() => {
        const oauthBody = this.oauthRequestBody();
        if (!oauthBody || !oauthBody.access_token) {
            return '';
        }
        return oauthBody.access_token
            .replace('nxcdb-', '')
            .split('.')
            .slice(0, 2)
            .map(chunk => JSON.parse(atob(chunk)));
    });

    copyToClipboard(value: string): void {
        this.clipboardService.copy(value);
    }

    login(): void {
        const body: Record<string, string | null> = {
            response_type: this.responseTypeControl.value,
            grant_type: this.grantTypeControl.value,
        };

        if (body.grant_type === 'password') {
            body.username = this.usernameControl.value;
            body.password = this.passwordControl.value;
        } else if (body.grant_type === 'refresh_token') {
            body.refresh_token = this.refreshTokenControl.value;
        } else {
            body.code = this.codeControl.value;
        }

        if (this.scopeControl.value) {
            body.scope = this.scopeControl.value;
        }

        this.http
            .post<Record<string, string>>('/cdb/oauth2/token', body)
            .subscribe(this.oauthRequestBody.set);
    }

    open(): void {
        window.open(this.authUrl(), '_blank');
    }
}
