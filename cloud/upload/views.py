import boto3
import structlog
import sys
from botocore import exceptions
from django.conf import settings
from django.http import Http404
from django.shortcuts import render
from rest_framework import status
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from uuid import uuid4

from cloud.helpers.exceptions import require_params, api_success
from cms.models import Asset, DataStructure, ExternalFile, rename_file

logger = structlog.getLogger(__name__)


class CsrfExemptSessionAuthentication(SessionAuthentication):

    def enforce_csrf(self, request):
        return  # To not perform the csrf check previously happening


upload_auth_permissions = authentication_classes(
    (CsrfExemptSessionAuthentication, BasicAuthentication))


if "pytest" not in sys.modules:
    # Don't connect to S3 within unit tests
    try:
        s3 = boto3.session.Session().client("s3")
        # Check if upload bucket exists
        s3.head_bucket(Bucket=settings.UPLOAD_BUCKET)
    except exceptions.NoCredentialsError:
        # Prevent pipeline failure
        pass
    except exceptions.ClientError:
        # Create upload bucket if doesn't exist
        logger.warning("missing_upload_bucket", bucket_name=settings.UPLOAD_BUCKET)


def get_param(request, key):
    return request.data.get(key, request.query_params.get(key, None))


def generate_presigned(key, upload_id, part_number):
    return s3.generate_presigned_url(
        ClientMethod='upload_part',
        Params={
            'Bucket': settings.UPLOAD_BUCKET,
            'Key': key,
            'UploadId': upload_id,
            'PartNumber': int(part_number),
        })


@api_view(["POST"])
@upload_auth_permissions
def generate_presigned_urls(request):
    require_params(request, ('uploadId', 'key', 'partNumbers'))

    part_numbers = get_param(request, 'partNumbers')

    return api_success({
        'presignedUrls': {
            f'{part_number}': generate_presigned(
                get_param(request, 'key'),
                get_param(request, 'uploadId'),
                part_number)
            for part_number in part_numbers
        }
    })


@api_view(["POST"])
@upload_auth_permissions
def create_multipart_upload(request):
    require_params(request, ('filename', 'type'))

    multipart_upload = s3.create_multipart_upload(
        Bucket=settings.UPLOAD_BUCKET,
        Key=f'{uuid4()}{settings.UPLOAD_SEPARATOR}{get_param(request, "filename")}',
        Expires=60*60,
        ContentType=get_param(request, "type"))

    return api_success({'key': multipart_upload['Key'], 'uploadId': multipart_upload['UploadId']})


@api_view(["POST"])
@upload_auth_permissions
def complete_multipart_upload(request, upload_id):
    require_params(request, ('parts',))
    key = get_param(request, 'key')

    try:
        res = s3.complete_multipart_upload(
            Bucket=settings.UPLOAD_BUCKET,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={'Parts': get_param(request, 'parts')})

    except Exception as e:
        if isinstance(e, s3.exceptions.NoSuchUpload):
            raise Http404 from e

        return Response(str(e), status=status.HTTP_400_BAD_REQUEST)

    return api_success({'location': res['Location']})

@api_view(["POST"])
@upload_auth_permissions
def move_completed_upload(request):
    require_params(request, ('key',))
    key = get_param(request, 'key')

    target_bucket = settings.AWS_STORAGE_BUCKET_NAME
    filename = key.split(settings.UPLOAD_SEPARATOR)[-1]
    source = {'Bucket': settings.UPLOAD_BUCKET, 'Key': key}
    temp_copy = {**source, 'Key': str(uuid4())}

    # Temporary copy is needed because of the way S3 calculated MD5 for is different on multipart uploads from actual MD5
    s3.copy(source, temp_copy['Bucket'], temp_copy['Key'])

    metadata = s3.head_object(**temp_copy)
    md5 = metadata['ETag'].strip('"').split('-')[0]
    size = metadata['ContentLength']
    user = request.user
    asset = (asset_id := get_param(request, 'asset')) and Asset.objects.filter(id=asset_id).first()
    ds = (ds_id := get_param(request, 'ds')) and DataStructure.objects.get(id=ds_id)
    created = ExternalFile.objects.create(
        user=user,
        md5=md5,
        size=size,
        asset=asset,
        data_structure=ds)
    created.file = rename_file(created, filename)

    # Move file to final location and rename, delete temporary copies
    s3.copy(source, target_bucket, created.file.name)
    s3.delete_object(**temp_copy)
    s3.delete_object(**source)

    created.save()

    return api_success({'md5': md5, 'size': size, 'user': user.email, 'filename': created.file.name})


@api_view(["GET"])
@upload_auth_permissions
def get_upload_parameters(request):
    require_params(request, ('filename', 'type'))

    res = s3.generate_presigned_post(
        Key=f'{uuid4()}{settings.UPLOAD_SEPARATOR}{get_param(request, "filename")}',
        Bucket=settings.UPLOAD_BUCKET,
        ExpiresIn=60*60,
        Fields={'success_action_status': '201', 'content-type': get_param(request, 'type')})

    return api_success({'method': 'post', 'url': res['url'], 'fields': res['fields']})


@api_view(["GET"])
@upload_auth_permissions
def sign_partial_upload(request, upload_id=None, part_number=None):
    require_params(request, ('key',))
    if part_number == 'batch':
        part_numbers = map(int, parts.split(',')) if isinstance(
            parts := get_param(request, 'partNumbers'), str) else parts
        return api_success({
            'presignedUrls': {
                f'{part_number}': generate_presigned(
                    get_param(request, 'key'),
                    upload_id,
                    part_number)
                for part_number in part_numbers
            }
        })

    return api_success({
        'url': generate_presigned(
            get_param(request, 'key'),
            upload_id,
            part_number)
    })


def abort_upload(upload_id, key):
    s3.abort_multipart_upload(
        Bucket=settings.UPLOAD_BUCKET,
        Key=key,
        UploadId=upload_id)

    return api_success({})


def get_uploaded_parts(upload_id, key):
    res = s3.list_parts(Bucket=settings.UPLOAD_BUCKET, Key=key, UploadId=upload_id)

    return api_success(res['Parts'] if 'Parts' in res else [])


@api_view(["GET", "DELETE"])
@upload_auth_permissions
def upload_handler(request, upload_id=None):
    require_params(request, ('key',))
    handler = abort_upload if request.method == 'DELETE' else get_uploaded_parts

    try:
        return handler(upload_id=upload_id, key=get_param(request, 'key'))

    except s3.exceptions.NoSuchUpload as e:
        raise Http404 from e


def demo(request):
    return render(request, "upload/demo.html")
