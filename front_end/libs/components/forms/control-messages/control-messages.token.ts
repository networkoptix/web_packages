import { InjectionToken } from '@angular/core';

import { NxControlMessagesComponent as NxMessages } from './control-messages.component';

export const NxControlMessagesToken = new InjectionToken<NxMessages>('NxControlMessages');
