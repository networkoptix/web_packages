import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';

import {
    CdbBindResponse,
    ChannelPartnerBindResponse,
    CloudTokens,
    DeleteResponse,
} from '@authorization/src/app/types/bind-service.types';
import { environment } from '@environments/environment';
import { nxConfig } from '@services/nx-config/config';

import { Org } from '../../types/cloud-bind.types';

@Injectable()
export class BindToCloudService {
    // Todo: Comeback and define this dynamically
    readonly apiBase = 'partners/api/v2';
    http = inject(HttpClient);

    private tokens$$ = signal<CloudTokens>({ access_token: '', refresh_token: '' });
    tokensForVMS$$ = this.tokens$$.asReadonly();

    private buildRequestHeaders(): HttpHeaders {
        let headers = new HttpHeaders();
        headers = headers.set('Authorization', `Bearer ${this.tokens$$().access_token}`);
        headers = headers.set(
            'cloud-host',
            environment.production ? window.location.host : 'cloud-test.hdw.mx',
        );
        return headers;
    }

    private getTokens(code: string): Observable<CloudTokens> {
        return this.http
            .post<CloudTokens>('/cdb/oauth2/token', {
                grant_type: 'authorization_code',
                response_type: 'token',
                code,
            })
            .pipe(tap(tokens => this.tokens$$.set(tokens)));
    }

    private deleteToken(token: string): Observable<DeleteResponse> {
        const headers = this.buildRequestHeaders();
        return this.http.delete<DeleteResponse>(`/cdb/oauth2/token/${token}`, {
            headers,
        });
    }

    bindToAccount(name: string): Observable<CdbBindResponse> {
        const headers = this.buildRequestHeaders();
        const data = {
            name,
            customization: nxConfig.customization,
        };
        return this.http.post<CdbBindResponse>('/cdb/system/bind', data, { headers });
    }

    bindToOrg(name: string, orgId: string): Observable<ChannelPartnerBindResponse> {
        const headers = this.buildRequestHeaders();
        const data = {
            name,
            customization: nxConfig.customization,
            organization: orgId,
            opaque: '',
        };
        return this.http.post<ChannelPartnerBindResponse>(`/${this.apiBase}/cloud_systems/`, data, {
            headers,
        });
    }

    getOrgs(code: string): Observable<Org[]> {
        return this.getTokens(code).pipe(
            switchMap(() =>
                this.http.get<{ results: Org[] }>(`/${this.apiBase}/organizations/`, {
                    params: { includeChildOrgs: true },
                    headers: this.buildRequestHeaders(),
                }),
            ),
            map(res => res.results),
        );
    }

    deleteTokens(): Observable<DeleteResponse> {
        const { access_token, refresh_token } = this.tokens$$();
        return this.deleteToken(refresh_token).pipe(
            switchMap(() => this.deleteToken(access_token)),
            tap(() => this.tokens$$.set({ access_token: '', refresh_token: '' })),
        );
    }
}
