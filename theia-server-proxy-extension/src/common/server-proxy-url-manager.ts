/********************************************************************************
 * Copyright (C) 2021 Jon Radchenko and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { inject, injectable, postConstruct } from 'inversify';
import { ILogger } from '@theia/core';
import { ServerProxyConfiguration } from './server-proxy-configuration';
import { ServerProxy } from './server-proxy';

export interface PathDetails {
    instanceId: string,
    serverProxyId: string,
    serverProxyBasePath: string
}

@injectable()
export class ServerProxyUrlManager {
    private rootKeyword: string = "server-proxy";

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(ServerProxyConfiguration)
    protected readonly serverProxyConfiguration: ServerProxyConfiguration;

    // Where theia home is served from, eg /theia
    public theiaHomePath: string;

    // public path that the server proxies are served from, eg /theia/server-proxy
    public serverProxyPublicRootPath: string;

    // A section is defined as a single 'folder' of a path, eg /foo/bar would have two sections, foo and bar
    // this is the total number of sections expected in a valid path
    private sectionCount: number;

    // internal path that the server proxies are served from, used for communicating localhost to localhost. ie: /server-proxy
    private serverProxyInternalRootPath: string;

    // section index of the word server-proxy
    private serverProxyIndex: number;

    // section index of the server proxy id, eg for /<THEIA_HOME>/server-proxy/<SERVER_PROXY_ID>/<SERVER_PROXY_INSTANCE_ID> we'd have 3 (0 = '', 1 = <THEIA_HOME>, etc)
    private serverProxyIdIndex: number;

    // section index of the server proxy instance id, eg 4 for the above example
    private serverProxyInstanceIdIndex: number;

    @postConstruct()
    protected async init(): Promise<void> {
        this.theiaHomePath = this.normalizeTheiaHomePath(await this.serverProxyConfiguration.getTheiaHomePath());

        this.serverProxyInternalRootPath = `/${this.rootKeyword}`;

        let homePathSections = 0;
        if (this.theiaHomePath) {
            // path will look like: /foo/bar/server-proxy/jupyter/1/
            this.serverProxyPublicRootPath = `${this.theiaHomePath}${this.serverProxyInternalRootPath}`;
            homePathSections = this.theiaHomePath.split('/').length - 1;
        } else {
            // path will look like: /server-proxy/jupyter/1/
            this.serverProxyPublicRootPath = this.serverProxyInternalRootPath;
        }

        this.serverProxyIndex = 1 + homePathSections;
        this.serverProxyIdIndex = 2 + homePathSections;
        this.serverProxyInstanceIdIndex = 3 + homePathSections;
        this.sectionCount = 4 + homePathSections;
    }

    public getPathMatchRegex(): string {
        return `^(/[^ /]*){${this.sectionCount - 1}}`;
    }

    public getServerProxyHomePath(serverProxy: ServerProxy): string {
        return `${this.serverProxyPublicRootPath}/${serverProxy.id}/`;
    }

    public getPublicPath(serverProxy: ServerProxy, serverProxyInstanceId: string, subPath?: string): string {
        return `${this.serverProxyPublicRootPath}/${serverProxy.id}/${serverProxyInstanceId}/${subPath?.replace(/^\//, '') || ''}`;
    }

    public getInternalPath(serverProxy: ServerProxy, serverProxyInstanceId: string, subPath?: string): string {
        return `${this.serverProxyInternalRootPath}/${serverProxy.id}/${serverProxyInstanceId}/${subPath?.replace(/^\//, '') || ''}`;
    }

    public getDetailsFromPath(path: string): PathDetails | undefined {
        if (!path) {
            return;
        }

        const split = path.split('/');
        // note that because the path starts with a /, we expect index 0 to be empty
        if (!split || split.length < this.sectionCount || split[0] != '' || split[this.serverProxyIndex] != this.rootKeyword) {
            return;
        }

        const serverProxyId = split[this.serverProxyIdIndex];
        const instanceId = split[this.serverProxyInstanceIdIndex];

        return {
            instanceId,
            serverProxyId,
            serverProxyBasePath: split.slice(0, this.sectionCount).join('/') + '/'
        };
    }

    // The path should be either an empty string '', or start with a / and end without a /
    // eg /theia
    private normalizeTheiaHomePath(path: string): string {
        if (!path) {
            return '';
        }

        let normalized = path;
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }

        if (normalized.endsWith('/')) {
            normalized = normalized.substring(0, normalized.length - 1);
        }

        return normalized;
    }
}
