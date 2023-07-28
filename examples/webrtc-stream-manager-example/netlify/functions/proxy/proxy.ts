// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Handler } from '@netlify/functions'

export const handler: Handler = async (event, context) => {
  if (event.queryStringParameters) {
    const target = event.queryStringParameters.url!
    const body = await fetch(target).then(res => res.text())
    return {
      statusCode: 200,
      body
    }
  }

  return { statusCode: 400 }
}
