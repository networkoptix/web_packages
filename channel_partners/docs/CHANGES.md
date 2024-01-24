*Put here changes you think can affect development*

**2024-01-23**

Behavior of `channel_partner_factory` fixture is changed. Previously, 
`channel_partner_factory(parent_channel_partner=None)` returned a root channel 
partner. Since only one channel partner is allowed now, `channel_partner_factory` 
sets `root_nx_channel_partner` as parent if it is missed or None. If you need for
a root channel partner in your test use `root_nx_channel_partner` fixture.


CPS redis server for local development is bound to port `6380` to avoid conflicts 
with redis in cloud portal environment.


