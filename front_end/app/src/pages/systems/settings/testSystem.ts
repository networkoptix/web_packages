import { NxSystem } from '../../../services/system.service';

export function setupTestSystem() : NxSystem {
  return {
    "cloudStorageSystemEnabled": false,
    "mediaservers": null,
    "resource_types": null,
    "canMerge": 1,
    "id": "c27aaff0-0694-469b-a8d6-c43cd8a9648c",
    "info": {
      "name": "4.1_dev_storage",
      "id": "c27aaff0-0694-469b-a8d6-c43cd8a9648c",
      "customization": "default",
      "authKey": "36b03b54-263f-411f-bcff-5605e937966c",
      "ownerAccountEmail": "noptixautoqa+owner@gmail.com",
      "status": "activated",
      "cloudConnectionSubscriptionStatus": true,
      "systemSequence": 32795,
      "opaque": "{\"localSystemId\":\"{6c0649c5-32c2-4e12-b7da-a0308cde80b7}\"}",
      "registrationTime": "1603409608520",
      "ownerFullName": "testFirstName testLastName",
      "accessRole": "owner",
      "sharingPermissions": [
        {
          "accessRole": "maintenance"
        },
        {
          "accessRole": "liveViewer"
        },
        {
          "accessRole": "viewer"
        },
        {
          "accessRole": "advancedViewer"
        },
        {
          "accessRole": "localAdmin"
        },
        {
          "accessRole": "cloudAdmin"
        }
      ],
      "stateOfHealth": "online",
      "usageFrequency": 64,
      "lastLoginTime": "1603409608555",
      "capabilities": {
        "advanced_lens_control": 1,
        "camera_auth_server_side_encryption": 1,
        "cloudMerge": 1,
        "get_time_of_servers_version": 2,
        "layoutApiVersion": 1,
        "mediaserver_metrics": 1,
        "merge_history": 1,
        "merge_systems": 1,
        "primaryTimeServerDefinesInternetTimeSync": 1,
        "restartMethodVersion": 2,
        "set_camera_param_post": 1,
        "vms_metrics": 1
      },
      "isMine": true,
      "canMerge": 1
    },
    "_isAvailable": true,
    "isOnline": true,
    "stateMessage": "",
    "_subscribersCount": {
      "_isScalar": false,
      "observers": [],
      "closed": false,
      "isStopped": false,
      "hasError": false,
      "thrownError": null,
      "_value": 2
    },
    "show404": false,
    "currentBusyServerIds": {},
    "licensesModifiedSubject": {
      "_isScalar": false,
      "observers": [],
      "closed": false,
      "isStopped": false,
      "hasError": false,
      "thrownError": null,
      "_value": ""
    },
    
    "currentServerNotBusy": true,
    "currentUserEmail": "noptixautoqa+owner@gmail.com",
    "mediaserver": {
      "emptyId": "{00000000-0000-0000-0000-000000000000}",
      "http": {
        "$ref": "$[\"cloudApi\"][\"configService\"][\"http\"]"
      },
      "CONFIG": {
        "$ref": "$[\"cloudApi\"][\"configService\"][\"config\"]"
      },
      "location": {
        "$ref": "$[\"systemApiService\"][\"location\"]"
      },
      "cacheService": {
        "$ref": "$[\"cloudApi\"][\"configService\"][\"http\"][\"handler\"][\"chain\"][\"next\"][\"interceptor\"][\"cacheRegistrationService\"]"
      },
      "cookieService": {
        "$ref": "$[\"systemApiService\"][\"cookieService\"]"
      },
      "healthService": {
        "$ref": "$[\"systemApiService\"][\"healthService\"]"
      },
      "appState": {
        "$ref": "$[\"cloudApi\"][\"configService\"][\"http\"][\"handler\"][\"chain\"][\"next\"][\"next\"][\"interceptor\"][\"appState\"]"
      },
      "authGet": "MTVkNDdlZjc0YTk0NDJkMzgzODE1MDA2ZGM1YzBlN2UtMzQyNTcyODY4NzpuaXdYNUlkcEJuaUFsNXNGelRYYTFoZmdvbHJVVTg9aHp4cHBjOjRlNWUxMGFiZmZiNmYwMjRhNzkzODk3OTQ4ODk5OTJm",
      "authPost": "MTVkNDdlZjc0YTk0NDJkMzgzODE1MDA2ZGM1YzBlN2UtMzQyNTcyODY4NzpuaXdYNUlkcEJuaUFsNXNGelRYYTFoZmdvbHJVVTg9aHp4cHBjOmM3YmNmZTJhYzVhZGQ5OGQ4MDA3YzUwMzUxZjM1ZWFi",
      "authPlay": "MTVkNDdlZjc0YTk0NDJkMzgzODE1MDA2ZGM1YzBlN2UtMzQyNTcyODY4NzpuaXdYNUlkcEJuaUFsNXNGelRYYTFoZmdvbHJVVTg9aHp4cHBjOjgyYjUxNmM2ODU3ZGI2ODkzNDBjMTRlNDY2MTZiODdk",
      "userEmail": "noptixautoqa+owner@gmail.com",
      "systemId": "c27aaff0-0694-469b-a8d6-c43cd8a9648c",
      "urlBase": "https://c27aaff0-0694-469b-a8d6-c43cd8a9648c.relay.vmsproxy.hdw.mx"
    },
  }
}


