// src/plugin.ts

import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import express, { Router } from 'express';
import { ResourceGraphClient } from '@azure/arm-resourcegraph';
import { ClientSecretCredential, DefaultAzureCredential } from '@azure/identity';
import { azureResourceConfig } from '../config';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';

export const azureResourcePlugin = createBackendPlugin({
  pluginId: 'azure-resources',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        http: coreServices.httpRouter,
        catalogApi: catalogServiceRef,
        discovery: coreServices.discovery,
      },
      async init({ config, logger, http }) {
        const azureConfig = azureResourceConfig.fromConfig(config);
        const cred = azureConfig 
          ? new ClientSecretCredential(azureConfig.tenantId, azureConfig.clientId, azureConfig.clientSecret) 
          : new DefaultAzureCredential();

        const client = new ResourceGraphClient(cred);
        const router = Router();

        router.use(express.json());

        router.get('/health', (_, response) => {
          logger.info('PONG!');
          response.send({ status: 'OK - azure resource backend api' });
        });

        router.get('/rg/:tagKey/:tagValue', async (req, response) => {
          try {
            const { tagKey, tagValue } = req.params;
            if (!tagKey) {
              return response.status(400).send({ error: 'tagKey must be defined' });
            }
            const query = `ResourceContainers
            | where type =~ "microsoft.resources/subscriptions/resourcegroups"
            | where tags["${tagKey}"] =~ "${tagValue}"`;

            const result = await client.resources({ query }, { resultFormat: 'table' });
            return response.send({ total: result.count, data: result.data });
          } catch (e) {
            const error = e as Error;
            return response.status(500).send({ error: error.message });
          }
        });

        router.get('/rg/:tagKey/:tagValue/secrecommendations', async (req, response) => {
          try {
            const { tagKey, tagValue } = req.params;
            if (!tagKey) {
              return response.status(400).send({ error: 'tagKey must be defined' });
            }
            const query = `ResourceContainers
            | where type =~ "microsoft.resources/subscriptions/resourcegroups"
            | where tags["${tagKey}"] =~ "${tagValue}"
            | join (securityresources
                | where type == 'microsoft.security/assessments'
                | extend statusCode=properties.status.code,
                  resourceId=tolower(properties.resourceDetails.Id),
                  severity = properties.metadata.severity,
                  displayName = properties.metadata.displayName,
                  link = properties.links.azurePortal
                | join kind=leftouter(
                  resources | extend resourceName = name
                        | extend resourceId = tolower(id)
                        | extend resourceType = type
                        | project resourceName, resourceId, resourceType) on resourceId
            ) on resourceGroup
          | where statusCode =~"Unhealthy"
          | project resourceId, displayName, link, resourceName, resourceType, resourceGroup, severity`;
            const result = await client.resources({ query }, { resultFormat: 'table' });
            return response.send({ total: result.count, data: result.data });
          } catch (e) {
            const error = e as Error;
            return response.status(500).send({ error: error.message });
          }
        });

        router.get('/rg/:tagKey/:tagValue/costadvice', async (req, response) => {
          try {
            const { tagKey, tagValue } = req.params;
            if (!tagKey) {
              return response.status(400).send({ error: 'tagKey must be defined' });
            }
            const query = `ResourceContainers
            | where type =~ "microsoft.resources/subscriptions/resourceGroups"
            | where tags["${tagKey}"] =~ "${tagValue}"
            | join (AdvisorResources
                | where type == 'microsoft.advisor/recommendations'
                | where properties.category == 'Cost'
                | extend
                  resources = tostring(properties.resourceMetadata.resourceId),
                  savings = todouble(properties.extendedProperties.savingsAmount),
                  solution = tostring(properties.shortDescription.solution),
                  currency = tostring(properties.extendedProperties.savingsCurrency),
                  impact = tostring(properties.impact)
                )   on subscriptionId
            | summarize
              dcount(resources),
              bin(sum(savings), 0.01)
              by solution, currency, impact
            | project-away dcount_resources`;
            const result = await client.resources({ query }, { resultFormat: 'table' });
            return response.send({ total: result.count, data: result.data });
          } catch (e) {
            const error = e as Error;
            return response.status(500).send({ error: error.message });
          }
        });

        http.use(router);
      },
    });
  },
});

// export default azureResourcePlugin;
