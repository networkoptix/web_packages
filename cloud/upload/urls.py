from django.conf.urls import url
from django.urls import path
from upload import views

urlpatterns = [
    path('', views.demo, name='upload_companion'),
    url(r'^sign$', views.generate_presigned_urls),
    url(r'^move_completed_upload$', views.move_completed_upload, name='move_completed_upload'),
    url(r'^s3/params$', views.get_upload_parameters),
    url(r'^s3/multipart/(?P<upload_id>.+?)/complete$',
        views.complete_multipart_upload),
    url(r'^s3/multipart/(?P<upload_id>.+?)/(?P<part_number>.+?)$',
        views.sign_partial_upload),
    url(r'^s3/multipart/(?P<upload_id>.+?)$', views.upload_handler),
    url(r'^s3/multipart$', views.create_multipart_upload)
]
