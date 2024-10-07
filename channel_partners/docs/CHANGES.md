*Put here changes you think can affect development*

## 2024-10-03 - Packages update breaking changes

Known breaking changes in packages:

- `S3Boto3Storage.exists()` has been changed and does not check file existence if `file_overwrite=True` 
[LINK](https://github.com/jschneier/django-storages/commit/a5319477473e5bab60b0d698e2a8127a8f750787)
- Changes in `pytest-httpx` handling of not called, called multiple times or unexpected requests 
[LINK](https://github.com/Colin-b/pytest_httpx/blob/master/README.md#configuring-httpx_mock)

Changes:

- Added ability to run UT in parallel with [pytest-xdist](https://github.com/pytest-dev/pytest-xdist) plugin. To run 
tests in parallel use `pytest -n NUMBER_OF_WORKERS` command. Maximum 6 workers are allowed.
- Fixed race condition in `create_root_channel_partner` script which causes deadlock on services table. 
Primary cause most likely is using transactions in celery tasks those may be run concurrently. 
Added context variable `disable_cp_service_population` which disables service population when set to true.

## 2024-07-26 - Service-to-Service Authorization Changes

- Service authorization credentials are required for running server locally.
- You can copy `Service auth` from src/config/.env.dist to src/config/.env.local. 
- That fake credentials allow tests to pass and work with local server, exception 
 is some server interactions with CDB which are made in background tasks. 
- These task cannot harm local development, but if you need for them running 
 properly ask web-backend team for proper credentials.

## 2024-07-13 - Reports snapshot schema version

Any changes to usage reports data schema (data types and serializers) **must** 
 be done with incrementing `partner.models.ReportSnapshot.CURRENT_SCHEMA_VERSION` constant.

## 2024-02-22 - Updated Notes About Environmental Variables

- **CI Pipeline**: The GitLab CI Pipeline loads *Environmental Variables* from `./cloud_portal/.gitlab-ci.yml`, under the **variables** sections relating to **Channel Partner** pipelines.
- **.env.dist**: This file is used as an example for what should be in the Channel Partner `.env.local` and the **variables** sections inside `.gitlab-ci.yml`. 
- **Added Env Vars**
  - ANON_RATE_LIMIT
  - SYSTEM_RATE_LIMIT
  - USER_RATE_LIMIT

## 2024-01-31 - Configuration changes

- **Local development**: Copy content of `src/config/.env.dist` to `src/config/.env.local` file.

- ~~**CI pipelines**: Pipeline use base configuration from `src/config/.env.dist` base file. Local
  development uses non standard redis port, for pipelines in is set in JOB variables.~~

- **Project build**:  While building project management command `collectstatic` is called. To let
  it run properly django loads variables from `src/config/.env.dist` base file.

- **Production**: Django configuration variables **must** be set in environment for production.
  If some required is not set error will be raised on bootstrapping.

## 2024-01-23

Behavior of `channel_partner_factory` fixture is changed. Previously,
`channel_partner_factory(parent_channel_partner=None)` returned a root channel
partner. Since only one channel partner is allowed now, `channel_partner_factory`
sets `root_nx_channel_partner` as parent if it is missed or None. If you need for
a root channel partner in your test use `root_nx_channel_partner` fixture.

CPS redis server for local development is bound to port `6380` to avoid conflicts
with redis in cloud portal environment.
