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
import { RawProcess } from '@theia/process/lib/node';
import * as http from 'http';
import { Event, Emitter, Disposable } from '@theia/core';
import { ServerProxyInstanceStatus, StatusId } from '../common/server-proxy';

// TODO: configurable
const RETRY_TIME = 1_000;
const TIMEOUT = 30_000;

export class ServerProxyInstance implements Disposable {
    public readonly statusChanged: Event<ServerProxyInstanceStatus>;
    private readonly statusChangedEmitter: Emitter<ServerProxyInstanceStatus>;

    private _status: ServerProxyInstanceStatus;

    public get status(): ServerProxyInstanceStatus {
        return this._status;
    }

    private disposables: Disposable[] = [];

    private fireStatusChanged(statusId: StatusId, message?: string) {
        this._status = {
            instanceId: this.appId,
            statusId: statusId,
            statusMessage: message,
            timeMs: new Date().getTime()
        };

        this.statusChangedEmitter.fire(this._status);
    }

    constructor(
        public readonly appId: number,
        public readonly serverProxyId: string,
        public readonly port: number,
        private readonly process: RawProcess
    ) {
        this.statusChangedEmitter = new Emitter<ServerProxyInstanceStatus>();
        this.statusChanged = this.statusChangedEmitter.event;

        this.fireStatusChanged(StatusId.starting);

        this.disposables.push(process.onClose(() => {
            this.fireStatusChanged(StatusId.stopped);
        }))
    }

    private async isAccessible(): Promise<Boolean> {
        return new Promise((resolve) => {
            // TODO 0 share this
            const request = http.get(`http://localhost:${this.port}/server-proxy/${this.serverProxyId}/${this.appId}/`);

            request.on('error', () => resolve(false));
            request.on('response', () => resolve(true));
        });
    }

    public stop(): void {
        this.process.kill();
    }

    public async init(): Promise<void> {
        try {
            await this.process.onStart;
            this.fireStatusChanged(StatusId.waitingForPort);

            const startTime = new Date().getTime();

            while (!(await this.isAccessible())) {
                await new Promise(resolve => setTimeout(resolve, RETRY_TIME));
                if (new Date().getTime() - startTime > TIMEOUT) {
                    throw new Error("Timed out waiting for app to start");
                }
            }

            this.fireStatusChanged(StatusId.started);
        } catch (e) {
            this.stop();
            this.fireStatusChanged(StatusId.errored, e.toString());
        }
    }

    dispose(): void {
        this.stop();
        this.disposables.forEach(d => d.dispose());
    }
}
