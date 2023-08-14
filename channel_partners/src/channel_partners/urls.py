"""
URL configuration for channel_partners project.
"""
from django.contrib import admin
from django.urls import path, include, re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('utils/', include('utils.urls')),
]