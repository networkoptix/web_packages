import os
from dataclasses import (
    dataclass,
    field,
)
from pathlib import Path
from typing import (
    Optional,
    Tuple,
)

import structlog
import yaml
from nx_ireg.registry import IReg


logger = structlog.getLogger(__name__)

@dataclass
class PostgresConfig:
    host: str
    port: int
    database: str
    username: str
    password: str


@dataclass
class InstanceConfig:
    env_name: str
    postgres: PostgresConfig
    default_host: str = None
    debug: bool = False
    redis_host: str = None
    redis_port: int = 6379
    notification_auth: Tuple[str, str] | None = None
    instance_name: str = field(default=os.getenv('INSTANCE_NAME'))
    ireg: Optional[IReg] = None

    def __post_init__(self):
        self.postgres = PostgresConfig(**self.postgres)
        if self.is_local_docker:
            self.postgres.host = 'postgres_cp'
            self.redis_host = 'redis_cp'
        if all(notification_secret := os.getenv('NOTIFICATION_SECRET', '').split(':')):
            self.notification_auth = (notification_secret[0], notification_secret[1])
        if self.instance_name:
            # In some cases (eg build) INSTANCE_NAME is not set
            self.ireg = IReg(instance_name=self.instance_name)
            if not self.default_host:
                self.default_host = self.ireg.get_default_host()

    @property
    def celery_db_index(self):
        return 15

    @property
    def queue_broker_uri(self):
        if self.env_name == 'prod':
            return os.getenv('QUEUE_CELERY_BROKER_URL', None) or 'sqs://'
        return f'redis://{self.redis_host}:{self.redis_port}/{self.celery_db_index}'

    @property
    def is_local_docker(self):
        return bool(os.getenv('LOCAL_DOCKER', False))


def get_config(env_name: str):
    conf_dir = Path(__file__).resolve().parent.parent.parent.joinpath('config')
    conf_name = conf_dir.joinpath(f'channel_partners.{env_name}.yaml')
    if not conf_name.exists():
        raise ValueError(f'Cannot stat config file: {conf_name}')
    with open(conf_name, 'r') as f:
        conf_dict = yaml.safe_load(f)

    return InstanceConfig(env_name=env_name, **conf_dict)
