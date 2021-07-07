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

import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from 'inversify';
import { WidgetOpenHandler, WidgetOpenerOptions, OpenerService, open as genericOpen } from '@theia/core/lib/browser';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyWidget, ServerProxyWidgetOptions } from './server-proxy-widget';
import { IFrameWidgetMode } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-widget';
import { Path } from '@theia/core';
import { ServerProxyUrlManager } from '../common/server-proxy-url-manager';

export interface UriDetails {
    instanceId: string,
    serverProxyId: string
}

@injectable()
export class ServerProxyOpenHandler extends WidgetOpenHandler<ServerProxyWidget> {
    public readonly id = ServerProxyWidget.ID;

    public readonly scheme = "server-proxy";

    protected readonly openerPriority = 500;

    @inject(ServerProxyUrlManager)
    protected readonly serverProxyUrlManager: ServerProxyUrlManager;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    canHandle(uri: URI): number {
        return this.isServerProxyUri(uri) ? this.openerPriority : -1;
    }

    protected createWidgetOptions(uri: URI, options?: WidgetOpenerOptions): ServerProxyWidgetOptions {
        const id = this.getInstanceId(uri);
        if (!id) {
            throw new Error('Malformed path');
        }

        return {
            serverProxyInstanceId: id,
            mode: IFrameWidgetMode.MiniBrowser
        }
    }

    public getOpenUri(instance: ServerProxyInstance, path?: string): URI {
        const fullPath = new Path('/').join(instance.id).join(path || '')
        return new URI()
            .withScheme(this.scheme)
            .withAuthority(instance.serverProxy.id)
            .withPath(fullPath);
    }

    // server-proxy://SERVER_PROXY_ID/SERVER_PROXY_INSTANCE_ID/
    public getDetailsFromUri(uri: URI): UriDetails | undefined {
        if (uri.scheme != this.scheme) {
            return this.serverProxyUrlManager.getDetailsFromPath(uri.path?.toString())
        }

        const serverProxyId = uri.authority;

        const split = uri.path.toString().split('/');
        if (!split || split.length < 2) {
            return;
        }

        return {
            serverProxyId,
            instanceId: split[1]
        };
    }

    private isServerProxyUri(uri: URI): boolean {
        return uri.scheme == this.scheme;
    }

    public getServerProxyId(uri: URI): string {
        return uri.authority;;
    }

    public getInstanceId(uri: URI): string | undefined {
        const details = this.getDetailsFromUri(uri);

        return details?.instanceId;
    }

    public getPath(uri: URI): Path | undefined {
        if (!this.isServerProxyUri(uri) || !uri.path) {
            return undefined;
        }

        const path = uri.path.toString();

        const slashIndex = path.indexOf('/', 1);
        if (slashIndex < 0) {
            return undefined;
        }

        const result = path.substring(slashIndex + 1);
        if (result === '') {
            return undefined;
        }

        return new Path(result);
    }

    public async openInstance(instance: ServerProxyInstance, path?: string): Promise<ServerProxyWidget | undefined> {
        const result = await genericOpen(
            this.openerService,
            this.getOpenUri(instance, path)
        );

        return result as ServerProxyWidget;
    }
}
