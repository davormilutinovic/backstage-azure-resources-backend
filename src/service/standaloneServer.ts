// src/standalonserver.ts

import { createServiceBuilder } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { Server } from 'http';
import { Logger } from 'winston';
import azureResourcePlugin from '../index';
import { createBackend } from '@backstage/backend-defaults';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
  config: Config;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'azure-resources-backend' });
  // const config = options.config;
  logger.debug('Starting application server...');

  // Create the backend and add the plugin
  const backend = createBackend();
  backend.add(azureResourcePlugin);

  const serviceBuilder = createServiceBuilder(module)
    .setPort(options.port);

  if (options.enableCors) {
    serviceBuilder.enableCors({ origin: 'http://localhost:3000' });
  }

  // Initialize the backend
  await backend.start();

  return serviceBuilder.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
