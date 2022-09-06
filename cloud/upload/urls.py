from django.urls import path, re_path
from upload import views

urlpatterns = [
    path('', views.demo, name='upload_companion'),
    re_path(r'^sign$', views.generate_presigned_urls),
    re_path(r'^move_completed_upload$', views.move_completed_upload, name='move_completed_upload'),
    re_path(r'^s3/params$', views.get_upload_parameters),
    re_path(r'^s3/multipart/(?P<upload_id>.+?)/complete$',
        views.complete_multipart_upload),
    re_path(r'^s3/multipart/(?P<upload_id>.+?)/(?P<part_number>.+?)$',
        views.sign_partial_upload),
    re_path(r'^s3/multipart/(?P<upload_id>.+?)$', views.upload_handler),
    re_path(r'^s3/multipart$', views.create_multipart_upload)
]
