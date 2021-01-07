from django.conf.urls import include
from django.urls import path

import oauth2_provider.views as oauth2_views

from oauth import views


class CustomAuth:
    pass


oauth2_endpoint_views = [
    path('authorize/', oauth2_views.AuthorizationView.as_view(), name="authorize"),
    path('token/', oauth2_views.TokenView.as_view(), name="token"),
    path('revoke-token/', oauth2_views.RevokeTokenView.as_view(), name="revoke-token"),
]


urlpatterns = [
    path('oauth/', include('rest_framework_social_oauth2.urls')),
    path('oauth/authenticate/', views.authenticate, name='authenticate'),
    path('oauth/authorize/', views.authorize, name='authorize'),
    path('oauth/introspect/', views.validate, name='verify'),
    path('oauth/refresh/', views.refresh, name='refresh'),
    path('oauth/token/', views.token, name='token'),
]
