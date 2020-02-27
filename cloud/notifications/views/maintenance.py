from api.helpers.exceptions import api_success
import boto3
import json
import sys
from datetime import datetime, timedelta
from util.config import get_config

PERIOD = 60  # In seconds
APPROXIMATE_AGE_OF_OLDEST_MESSAGE_THRESHOLD = 600  # In seconds
APPROXIMATE_NUMBER_OF_MESSAGES_VISIBLE_THRESHOLD = 100


def _get_sqs_metrics():
    metric_result = {}

    conf = get_config()
    queue_name = '{}-celery'.format(conf['queue_name'])

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
                metric_result[mdr['Id']] = mdr['Values'][0] if mdr['Values'] else None

    return metric_result


def maintenance_health(request):
    metric_result = _get_sqs_metrics()

    oldest = metric_result['approximateAgeOfOldestMessage']
    number = metric_result['approximateNumberOfMessagesVisible']

    result = (oldest is None or oldest < APPROXIMATE_AGE_OF_OLDEST_MESSAGE_THRESHOLD) and \
             (number is None or number < APPROXIMATE_NUMBER_OF_MESSAGES_VISIBLE_THRESHOLD)

    return api_success({
        'ok': result,
        'details': {
            'approximateAgeOfOldestMessage': oldest,
            'approximateNumberOfMessagesVisible': number
        }
    })
