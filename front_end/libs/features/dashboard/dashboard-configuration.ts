import { v4 as uuid } from 'uuid';

import type { WidgetCard } from '@components/widgets/helper-classes';

export class DashboardConfiguration {
    constructor(
        public dashboardName = 'New Dashboard',
        public cards: WidgetCard[] = [],
        public id = uuid(),
    ) {}
}
