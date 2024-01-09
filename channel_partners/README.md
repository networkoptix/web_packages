# Logging

## Overview

- We are doing **Structured Logging**, which output logs in a key/value pair.
- We're utilizing [Django-StructLog](https://django-structlog.readthedocs.io/en/latest/index.html)

## Current Logs

| App      | File                     | Method                                            | Level    | Message                                              | Keys                                                                                                  |
|:---------|:-------------------------|:--------------------------------------------------|:---------|:-----------------------------------------------------|:------------------------------------------------------------------------------------------------------|
| partners | views.py                 | InternalGrantAccess::__apply_organization_role    | INFO     | Found user and deleting from organization_to_user    | email                                                                                                 |
| partners | views.py                 | InternalGrantAccess::__apply_channel_partner_role | INFO     | Found user and deleting from channel_partner_to_user | email                                                                                                 |
| partners | tasks.py                 | celery_health_check                               | INFO     | Celery health check                                  | organization_roles, channel_partner_roles                                                             | 
| partners | notification.py          | TaskWithLogging::on_failure                       | CRITICAL | Task failed                                          | task_id, args, kwargs, exception                                                                      |
| partners | notification.py          | TaskWithLogging::on_retry                         | ERROR    | Task retrying                                        | task_id, args, kwargs, exception                                                                      |
| partners | notification.py          | notification_added_channel_partner_role           | ERROR    | Unable to resolve                                    | task_name, channel_partner_id, partner, sharer_id, sharer, user_id, user                              |
| partners | notification.py          | notification_added_organization_role              | ERROR    | Unable to resolve                                    | task_name, organization_id, organization, sharer_id, sharer, user_id, user                            |
| partners | notification.py          | state_confirmation_task                           | ERROR    | Unable to find confirmation with id                  | id                                                                                                    |
| partners | notification.py          | state_confirmation_task                           | ERROR    | Unable to find cloud user with email                 | email                                                                                                 |
| scripts  | check_path_migraition.py | check_parent                                      | ERROR    | Missing path or parent                               | parent, path                                                                                          |
| scripts  | check_path_migraition.py | check_parent                                      | ERROR    | Path is invalid                                      | left, instance                                                                                        |
| scripts  | check_path_migraition.py | check_path_upto_root                              | INFO     | Checking path                                        | instance, path                                                                                        |
| scripts  | check_path_migraition.py | check_path_upto_root                              | INFO     | No parents                                           | N/A                                                                                                   |
| tools    | helpers.py               | forward_cdb_resp                                  | ERROR    | Unable to decode response from CDB                   | status_code, content                                                                                  |
| tools    | utils.py                 | bind_system_to_cdb_organization                   | ERROR    | Unable to bind system to CDB                         | request_headers, request_content, response_status_code, response_headers, response_content, exception |
| utils    | views.py                 | HealthCheckView::check_redis                      | ERROR    | Cannot retrieve cache server info.                   | exception                                                                                             |

## Examples

### JSON Log
```json
{"request": "GET /partners/internal/grant_access", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "event": "request_started", "request_id": "f2f3ebf5-cd2e-4930-bdb6-660867363c07", "ip": "127.0.0.1", "logger": "django_structlog.middlewares.request", "level": "info", "timestamp": "2024-01-04T20:39:22.634122Z", "lineno": 152, "filename": "request.py", "func_name": "prepare"}
{"code": 200, "request": "GET /partners/internal/grant_access", "event": "request_finished", "user_id": null, "request_id": "f2f3ebf5-cd2e-4930-bdb6-660867363c07", "ip": "127.0.0.1", "logger": "django_structlog.middlewares.request", "level": "info", "timestamp": "2024-01-04T20:39:22.662263Z", "lineno": 103, "filename": "request.py", "func_name": "handle_response"}

```
### Flat Line Log

```log
timestamp='2024-01-04T20:37:35.591103Z' level='info' event='request_started' logger='django_structlog.middlewares.request' request='GET /internal/grant_access.html' user_agent=None ip='127.0.0.1' request_id='8198fc80-fa28-4541-892f-46ae668817ae' func_name='prepare' filename='request.py' lineno=152
timestamp='2024-01-04T20:37:35.593484Z' level='info' event='request_finished' logger='django_structlog.middlewares.request' code=404 request='GET /internal/grant_access.html' ip='127.0.0.1' request_id='8198fc80-fa28-4541-892f-46ae668817ae' user_id=None func_name='handle_response' filename='request.py' lineno=103
```

### Console Log
```log
2024-01-04T20:37:24.650107Z [info     ] request_started                [django_structlog.middlewares.request] filename=request.py func_name=prepare ip=127.0.0.1 lineno=152 request=POST /partners/internal/grant_access request_id=57623c30-7e65-4284-851b-b42e735ab922 user_agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
2024-01-04T20:37:24.746176Z [info     ] request_finished               [django_structlog.middlewares.request] code=200 filename=request.py func_name=handle_response ip=127.0.0.1 lineno=103 request=POST /partners/internal/grant_access request_id=57623c30-7e65-4284-851b-b42e735ab922 user_id=None
```