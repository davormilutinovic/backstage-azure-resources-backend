import { Config } from '@backstage/config';
/** @public */
export declare class azureResourceConfig {
    readonly tenantId: string;
    readonly clientId: string;
    /**
     * @visibility secret
     */
    readonly clientSecret: string;
    constructor(tenantId: string, clientId: string, 
    /**
     * @visibility secret
     */
    clientSecret: string);
    static fromConfig(config: Config): azureResourceConfig | null;
}
