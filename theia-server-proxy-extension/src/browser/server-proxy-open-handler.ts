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

@injectable()
export class ServerProxyOpenHandler extends WidgetOpenHandler<ServerProxyWidget> {

    public readonly id = ServerProxyWidget.ID;

    protected readonly openerPriority = 200;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    canHandle(uri: URI): number {
        return ServerProxyOpenHandler.isServerProxyUri(uri) ? this.openerPriority : -1;
    }

    protected createWidgetOptions(uri: URI, options?: WidgetOpenerOptions): ServerProxyWidgetOptions {
        const id = ServerProxyOpenHandler.getInstanceId(uri);
        if (!id) {
            throw new Error('Malformed path');
        }

        return {
            serverProxyInstanceId: id
        }
    }

    protected async getOrCreateWidget(uri: URI): Promise<ServerProxyWidget> {
        const widget = await super.getOrCreateWidget(uri);
        await this.setProps(widget);

        return widget;
    }

    protected setProps(widget: ServerProxyWidget): Promise<void> {
        return widget.setProps({
            mode: IFrameWidgetMode.MiniBrowser
        });
    }
}

export namespace ServerProxyOpenHandler {
    export const scheme = "server-proxy";

    export function getOpenUri(instance: ServerProxyInstance): URI {
        return new URI().withScheme(scheme).withAuthority(instance.serverProxy.id).withPath(`/${instance.id}`);
    }

    export function isServerProxyUri(uri: URI): boolean {
        return uri.scheme == scheme;
    }

    export function getServerProxyId(uri: URI): string {
        return uri.authority;
    }

    export function getInstanceId(uri: URI): string | undefined {
        return isServerProxyUri(uri) ? uri.path?.toString()?.substring(1) : undefined;
    }

    export function open(openerService: OpenerService, instance: ServerProxyInstance) {
        return genericOpen(
            openerService,
            getOpenUri(instance)
        );
    }
}
