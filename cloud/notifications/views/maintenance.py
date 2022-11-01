from datetime import datetime, timedelta

import boto3
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg.utils import swagger_auto_schema

from util.config import get_config
from cloud.helpers.exceptions import handle_exceptions, api_success

PERIOD = 60  # In seconds
APPROXIMATE_AGE_OF_OLDEST_MESSAGE_THRESHOLD = 600  # In seconds
APPROXIMATE_NUMBER_OF_MESSAGES_VISIBLE_THRESHOLD = 100

PUSH_APPROXIMATE_AGE_OF_OLDEST_MESSAGE_THRESHOLD = 1200
PUSH_APPROXIMATE_NUMBER_OF_MESSAGES_VISIBLE_THRESHOLD = 20000


def _get_sqs_metrics(queue):
    metric_result = {}

    conf = get_config()
    queue_name = f'{conf["queue_name"]}-{queue}'

    cloudwatch = boto3.client('cloudwatch')
    paginator = cloudwatch.get_paginator('get_metric_data')

    metric_data_queries = [
        {
            'Id': 'approximateAgeOfOldestMessage',
            'MetricStat': {
                'Metric': {
                    'Namespace': 'AWS/SQS',
                    'MetricName': 'ApproximateAgeOfOldestMessage',
                    'Dimensions': [
                        {
                            'Name': 'QueueName',
                            'Value': queue_name
                        },
                    ]
                },
                'Period': PERIOD,
                'Stat': 'Average'
            }
        },
        {
            'Id': 'approximateNumberOfMessagesVisible',
            'MetricStat': {
                'Metric': {
                    'Namespace': 'AWS/SQS',
                    'MetricName': 'ApproximateNumberOfMessagesVisible',
                    'Dimensions': [
                        {
                            'Name': 'QueueName',
                            'Value': queue_name
                        },
                    ]
                },
                'Period': PERIOD,
                'Stat': 'Average'
            }
        }
    ]

    for response in paginator.paginate(
            MetricDataQueries=metric_data_queries,
            StartTime=datetime.utcnow() - timedelta(seconds=PERIOD),
            EndTime=datetime.utcnow(),
            ScanBy='TimestampDescending',
            MaxDatapoints=len(metric_data_queries)):
        for mdr in response['MetricDataResults']:
            if mdr['StatusCode'] == "Complete":
                metric_result[mdr['Id']
                              ] = mdr['Values'][0] if mdr['Values'] else None

    return metric_result


def check_queue(queue, age_threshold, number_visible_threshold):
    metric_result = _get_sqs_metrics(queue)

    oldest = metric_result['approximateAgeOfOldestMessage']
    number = metric_result['approximateNumberOfMessagesVisible']

    result = (oldest is None or oldest < age_threshold) and \
             (number is None or number < number_visible_threshold)

    return api_success({
        'ok': result,
        'details': {
            'approximateAgeOfOldestMessage': oldest,
            'approximateNumberOfMessagesVisible': number
        }
    })


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
def health_email(request):
    return check_queue(
        'celery', APPROXIMATE_AGE_OF_OLDEST_MESSAGE_THRESHOLD, APPROXIMATE_NUMBER_OF_MESSAGES_VISIBLE_THRESHOLD
    )


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
def health_push(request):
    return check_queue(
        'push-notification', PUSH_APPROXIMATE_AGE_OF_OLDEST_MESSAGE_THRESHOLD,
        PUSH_APPROXIMATE_NUMBER_OF_MESSAGES_VISIBLE_THRESHOLD
    )
