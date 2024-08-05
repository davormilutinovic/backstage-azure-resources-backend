/// <reference types="node" />
import { Config } from '@backstage/config';
import { Server } from 'http';
import { Logger } from 'winston';
export interface ServerOptions {
    port: number;
    enableCors: boolean;
    logger: Logger;
    config: Config;
}
export declare function startStandaloneServer(options: ServerOptions): Promise<Server>;
