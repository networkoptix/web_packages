import { NgModule } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";

@NgModule({
    imports : [TranslateModule.forRoot()],
    exports : [TranslateModule]
})
export class TranslateTestingModule {}

export class MockProvider<Provider, Value> {
    constructor(public provide: Provider, public useValue?: Value) {
        if (!useValue) {
            this.useValue = <Value>{};
        }
    }

    static mapServices = <T>(provider: T) =>
        provider instanceof MockProvider
            ? provider
            : new MockProvider<T, {}>(provider, {});
}

export const sanitizerMock = {
    sanitize                : (_, val) => val,
    bypassSecurityTrustHtml : (val) => val
};
