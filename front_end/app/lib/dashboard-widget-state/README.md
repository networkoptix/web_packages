Type definitions for use with interacting with SharedWidgetState injected from dashboard into the widget window.

Typical usage:
import { SharedWidgetState } from "dashboard-widget-state";
const sharedDashboardState = (window as any).sharedState as SharedWidgetState;
