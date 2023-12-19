import { Validators } from '@angular/forms';

export interface InfoRow {
    link: { value: string; validation: Validators[] };
    descr: { value: string; validation: Validators[] };
}

export interface CPInfo {
    sites: InfoRow[];
    phones: InfoRow[];
    emails: InfoRow[];
}
