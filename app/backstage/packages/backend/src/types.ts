import { Logger } from 'winston';
import { Config } from '@backstage/config';
import {
  PluginDatabaseManager,
  UrlReader,
  PluginEndpointDiscovery,
  TokenManager,
} from '@backstage/backend-common';
import { TaskScheduler } from '@backstage/backend-tasks';
import { PermissionAuthorizer } from '@backstage/plugin-permission-common';
import { IdentityApi } from '@backstage/plugin-auth-node';

export type PluginEnvironment = {
  logger: Logger;
  database: PluginDatabaseManager;
  config: Config;
  reader: UrlReader;
  discovery: PluginEndpointDiscovery;
  tokenManager: TokenManager;
  permissions: PermissionAuthorizer;
  identity: IdentityApi;
  scheduler: TaskScheduler;
};
