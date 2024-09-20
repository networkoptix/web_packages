# Desktop Notifications Project Documentation

## Overview

This project is a cloud-based notification system that uses Quart, Redis, and Structlog for handling and logging
notifications. It consists of two main services: `notification_provider` and `notification_receiver`. These services
communicate with each other and with clients via WebSockets and HTTP.

## Environment Variables

### Common Environment Variables

- `DEBUG`: Enables or disables debug mode.
    - **Values**: `true` or `false`
    - **Default**: `false`
- `ENV`: Specifies the environment in which the application is running.
    - **Values**: `development`, `production`
    - **Default**: `production`
- `REDIS_HOST`: The hostname of the Redis server.
    - **Default**: `localhost`
- `REDIS_PORT`: The port number of the Redis server.
    - **Default**: `6379`

### Local Environment Variables

For local development, you can set the following environment variables in a `.env` (TODO) file or export them in your shell:

```env
DEBUG=true
ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Production Environment Variables

For production, you should set the following environment variables:

```env
DEBUG=false
ENV=production
REDIS_HOST=<your_redis_host>
REDIS_PORT=<your_redis_port>
```

## Running the Project

### Using Docker Compose

1. **Build and start the services**:
   ```sh
   docker-compose up --build
   ```

2. **Access the services**:
    - `notification_provider`: http://localhost:5001
    - `notification_receiver`: http://localhost:5000

### Without Docker

1. **Install dependencies**:
   ```sh
   poetry install
   ```

2. **Run the services**:
    - **Provider**:
      ```sh
      cd desktop_notifications/notification_provider
      hypercorn --workers 4 --bind 0.0.0.0:8000 main:app
      ```
    - **Receiver**:
      ```sh
      cd desktop_notifications/notification_receiver
      hypercorn --workers 4 --bind 0.0.0.0:8000 main:app
      ```

## Logging

The project uses `structlog` for structured logging. The logging configuration is defined in
`./logging_config.py`. Logs are output in key/value format for development and JSON format for production.

## API Endpoints

### Notification Provider

- **WebSocket**: `/api/v1/subscribe`
    - **Description**: Subscribes a client to notifications.
- **HTTP**: `/api/v1/health`
    - **Description**: Returns the health status of the service.
- **HTTP**: `/api/v1/ping`
    - **Description**: Returns `pong` to check if the service is running.

### Notification Receiver

- **HTTP**: `/api/v1/send_notification`
    - **Description**: Sends a notification to specified targets.
- **HTTP**: `/api/v1/ping`
    - **Description**: Returns `pong` to check if the service is running.

## Authentication

The project uses token-based authentication for users and basic authentication for systems. The authentication logic is
implemented in `./notification_receiver/main.py`.

## Cloud API

The `CloudAPI` class in `./cloud.py` handles communication with the cloud for token validation and
system credential checks.

## Makefile

The `make.sh` script is used for building and publishing Docker images. It includes functions for packaging and pushing
the images to a registry.

```