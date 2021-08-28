from django.urls import path

from oauth import views


urlpatterns = [
    path("authenticate", views.authenticate, name="authenticate"),
    # path("authenticate_with_session", views.authenticate_with_session, name="authenticate_session"),
    path("logout/", views.logout, name="oauth_logout"),
    path("introspect/", views.validate_token, name="verify"),
    path("revoke/", views.revoke_token, name="revoke"),
    path("token/", views.token, name="token"),
]
