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

    constructor(
        public readonly id: string,
        public readonly context: any,
        public readonly serverProxyId: string,
        public readonly port: number,
        public readonly url: string,
        private readonly process: RawProcess
    ) {
        this.statusChangedEmitter = new Emitter<ServerProxyInstanceStatus>();
        this.statusChanged = this.statusChangedEmitter.event;

        this.setStatus(StatusId.starting);

        this.disposables.push(process.onClose(() => {
            this.setStatus(StatusId.stopped);
        }));

        this.disposables.push(process.onError((e: Error) => {
            this.setStatus(StatusId.errored, e.message);
        }));
    }

    private setStatus(statusId: StatusId, message?: string) {
        this._status = {
            instanceId: this.id,
            statusId: statusId,
            statusMessage: message,
            timeMs: new Date().getTime()
        };

        this.statusChangedEmitter.fire(this._status);
    }

    private async isAccessible(): Promise<Boolean> {
        return new Promise((resolve) => {
            // TODO 0 share this
            const request = http.get(`http://localhost:${this.port}/server-proxy/${this.serverProxyId}/${this.id}/`);

            request.on('error', () => resolve(false));
            request.on('response', () => resolve(true));
        });
    }

    private async doStop(signal?: number): Promise<boolean> {
        const timeout = 10_000;

        this.setStatus(StatusId.stopping)
        this.process.kill();

        await new Promise<void>((resolve) => {
            let disposable: Disposable | undefined;
            disposable = this.statusChanged(status => {
                if (status.statusId == StatusId.stopped) {
                    resolve();
                    disposable?.dispose();
                }
            });

            setTimeout(() => {
                resolve();
                disposable?.dispose();
            }, timeout);
        });

        if (this.process.killed) {
            return true;
        }

        return false;
    }

    public async stop(): Promise<boolean> {
        if (ServerProxyInstanceStatus.isCompleted(this.status)) {
            return true;
        }

        await this.doStop();
        if (this.process.killed) {
            return true;
        }

        return await this.doStop(9);

    }

    public async init(): Promise<void> {
        try {
            await this.process.onStart;
            this.setStatus(StatusId.waitingForPort);

            const startTime = new Date().getTime();

            while (!(await this.isAccessible())) {
                await new Promise(resolve => setTimeout(resolve, RETRY_TIME));
                if (new Date().getTime() - startTime > TIMEOUT) {
                    await this.stop();
                    this.setStatus(StatusId.errored, "Timed out waiting for instance to start");
                }
            }

            this.setStatus(StatusId.started);
        } catch (e) {
            await this.stop();
            this.setStatus(StatusId.errored, e.toString());
        }
    }

    dispose(): void {
        this.stop();
        this.disposables.forEach(d => d.dispose());
    }
}
