const spec = {
  openapi: '3.0.0',
  info: {
    title: 'Bridges Pulse — External API',
    version: '1.0.0',
    description: 'API for TestComplete (and other tools) to read and update service card statuses on the Bridges Pulse dashboard.'
  },
  servers: [
    { url: 'https://bridges-pulse.vercel.app', description: 'Production' },
    { url: 'http://localhost:3001', description: 'Local dev' }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    },
    schemas: {
      ServiceSummary: {
        type: 'object',
        properties: {
          serviceId:        { type: 'string', example: 'solq' },
          name:             { type: 'string', example: 'SOLQ' },
          category:         { type: 'string', example: 'functionalities' },
          status:           { type: 'string', example: 'Operational' },
          responseTime:     { type: 'string', example: '120ms' },
          problemStatement: { type: 'string', example: '' },
          lastUpdated:      { type: 'string', format: 'date-time' }
        }
      },
      UpdateItem: {
        type: 'object',
        properties: {
          serviceId:        { type: 'string', example: 'solq', description: 'Use serviceId OR serviceName' },
          serviceName:      { type: 'string', example: 'SOLQ',  description: 'Use serviceId OR serviceName' },
          status: {
            type: 'string',
            enum: ['Operational','OK','Running Normally','Average','Excellent','Degraded','Poor','Maintenance','Down','Unknown'],
            example: 'Operational'
          },
          responseTime:     { type: 'string', example: '120ms' },
          problemStatement: { type: 'string', example: 'Issue detected on login flow' }
        }
      },
      UpdateResult: {
        type: 'object',
        properties: {
          success:          { type: 'boolean' },
          serviceId:        { type: 'string' },
          name:             { type: 'string' },
          category:         { type: 'string' },
          status:           { type: 'string' },
          responseTime:     { type: 'string' },
          problemStatement: { type: 'string' },
          lastUpdated:      { type: 'string', format: 'date-time' },
          error:            { type: 'string', description: 'Present only when the item failed' }
        }
      }
    }
  },
  paths: {
    '/api/external/services': {
      get: {
        summary: 'List all services',
        description: 'Returns every service card with its current status. No API key required — use this to look up serviceId values.',
        tags: ['External'],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    services: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ServiceSummary' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/external/update': {
      post: {
        summary: 'Update one or more service cards',
        description: 'Push status updates from TestComplete. Identify services by `serviceId` or `serviceName`. Supports single or batch updates.',
        tags: ['External'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    title: 'Single update',
                    allOf: [{ $ref: '#/components/schemas/UpdateItem' }]
                  },
                  {
                    title: 'Batch update',
                    type: 'object',
                    required: ['updates'],
                    properties: {
                      updates: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/UpdateItem' }
                      }
                    }
                  }
                ]
              },
              examples: {
                single: {
                  summary: 'Single update by ID',
                  value: { serviceId: 'solq', status: 'Operational', responseTime: '120ms', problemStatement: '' }
                },
                byName: {
                  summary: 'Single update by name',
                  value: { serviceName: 'Account Transfer', status: 'Down', problemStatement: 'Test failure on transfer flow' }
                },
                batch: {
                  summary: 'Batch update',
                  value: {
                    updates: [
                      { serviceId: 'solq', status: 'Operational' },
                      { serviceId: 'azure_upload', status: 'Down', problemStatement: 'Upload endpoint unreachable' }
                    ]
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'All updates succeeded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: { type: 'array', items: { $ref: '#/components/schemas/UpdateResult' } }
                  }
                }
              }
            }
          },
          207: {
            description: 'Partial success — check each item in results for errors'
          },
          401: { description: 'Missing X-API-Key header' },
          403: { description: 'Invalid API key' }
        }
      }
    }
  }
};

module.exports = { spec };
