*Put here changes you think can affect development*

**2024-01-23**

Behavior of `channel_partner_factory` fixture is changed. Previously, 
`channel_partner_factory(parent_channel_partner=None)` returned a root channel 
partner. Since only one channel partner is allowed now, `channel_partner_factory` 
sets `root_nx_channel_partner` as parent if it is missed or None. If you need for
a root channel partner in your test use `root_nx_channel_partner` fixture.


CPS redis server for local development is bound to port `6380` to avoid conflicts 
with redis in cloud portal environment.

**2024-01-31 - Configuration changes**

**Local development.** Copy content of `src/config/.env.dist` to `src/config/.env.local` file.

**CI pipelines**. Pipeline use base configuration from `src/config/.env.dist` base file. Local 
development uses non standard redis port, for pipelines in is set in JOB variables.

**Project build**. While building project management command `collectstatic` is called. To let 
it run properly django loads variables from `src/config/.env.dist` base file.

**Production**. Django configuration variables **must** be set in environment for production. 
If some required is not set error will be raised on bootstrapping.
