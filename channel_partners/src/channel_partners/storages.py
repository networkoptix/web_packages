import structlog
from botocore.exceptions import ClientError
from storages.backends.s3boto3 import S3Boto3Storage


logger = structlog.get_logger(__name__)


class ReportsStorage(S3Boto3Storage):
    location = 'usage_reports'
    file_overwrite = True

    def generate_presigned_url(self, filename, expires_in):
        """
        Generate a presigned Amazon S3 URL for GET.
        """
        try:
            url = self.bucket.meta.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket.name, 'Key': self._normalize_name(filename)},
                ExpiresIn=300
            )
        except ClientError:
            logger.exception(
                "Couldn't get a presigned URL for client method",
                filename=filename,
                bucket=self.bucket.name,
            )
            raise
        return url

