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

import { injectable } from 'inversify';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyInstanceStatus, StatusId } from '../common/server-proxy';
import { IFrameWidget } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-widget';
import { IFrameModel, IFrameModelStatus } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-model';

@injectable()
export class ServerProxyWidget extends IFrameWidget {
    public static readonly ID: string = "server.proxy.widget";

    private readonly instance: ServerProxyInstance;

    private static buildStatus(instance: ServerProxyInstance): IFrameModelStatus {
        if (instance.status.statusId == StatusId.started) {
            return IFrameModelStatus.ready;
        } else if (ServerProxyInstanceStatus.isCompleted(instance.status)) {
            return IFrameModelStatus.stopped;
        } else {
            return IFrameModelStatus.loading;
        }
    }

    constructor(
        instance: ServerProxyInstance
    ) {
        super(
            IFrameWidget.buildWidgetId(`server-proxy/${instance.serverProxy.id}/${instance.id}/`),
            new IFrameModel(
                instance.serverProxy.name,
                `server-proxy/${instance.serverProxy.id}/${instance.id}/`,
                ServerProxyWidget.buildStatus(instance),
                false
            )
        );

        this.instance = instance;

        this.disposables.push(this.instance); // TODO this isn't right. What if we want it to stick around?
        this.disposables.push(instance.statusChangedEvent(() => {
            this.model.status = ServerProxyWidget.buildStatus(instance);
        }));
    }
}
