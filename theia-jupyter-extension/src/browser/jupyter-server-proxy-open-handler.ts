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
import { injectable } from 'inversify';
import { Extension } from '../common/const';
import { ServerProxyWidgetOptions } from 'theia-server-proxy-extension/lib/browser/server-proxy-widget';
import { ServerProxyOpenHandler } from 'theia-server-proxy-extension/lib/browser/server-proxy-open-handler';
import { IFrameWidgetMode } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-widget';

@injectable()
export class JupyterServerProxyOpenHandler extends ServerProxyOpenHandler {

    canHandle(uri: URI): number {
        return super.canHandle(uri) > 0 && ServerProxyOpenHandler.getServerProxyId(uri) == Extension.ID ? this.openerPriority + 100 : -1;
    }

    protected createWidgetOptions(uri: URI): ServerProxyWidgetOptions {
        const path = ServerProxyOpenHandler.getPath(uri);

        const baseOptions = super.createWidgetOptions(uri);
        if (!path) {
            return baseOptions;
        }

        const options: ServerProxyWidgetOptions = {
            ...baseOptions,
            mode: IFrameWidgetMode.IFrame,
            startPath: path.toString(),
            title: path.name
        };

        return options;
    }
}
