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

export interface ServerProxyInstance extends Disposable {
    readonly id: string;

    readonly serverProxyId: string;

    readonly context: any;

    readonly port: number;

    get status(): ServerProxyInstanceStatus;

    readonly statusChanged: Event<ServerProxyInstanceStatus>;

    stop(): Promise<boolean>;

    init(): Promise<void>;
}

export abstract class AbstractServerProxyInstance implements ServerProxyInstance {
    public readonly statusChanged: Event<ServerProxyInstanceStatus>;
    private readonly statusChangedEmitter: Emitter<ServerProxyInstanceStatus>;

    private _status: ServerProxyInstanceStatus;

    public get status(): ServerProxyInstanceStatus {
        return this._status;
    }

    protected disposables: Disposable[] = [];

    constructor(
        public readonly id: string,
        public readonly context: any,
        public readonly serverProxyId: string,
        public readonly port: number
    ) {
        this.statusChangedEmitter = new Emitter<ServerProxyInstanceStatus>();
        this.statusChanged = this.statusChangedEmitter.event;

        this.setStatus(StatusId.starting);
    }

    protected setStatus(statusId: StatusId, message?: string) {
        this._status = {
            instanceId: this.id,
            statusId: statusId,
            statusMessage: message,
            timeMs: new Date().getTime()
        };

        this.statusChangedEmitter.fire(this._status);
    }

    public abstract stop(): Promise<boolean>;

    public abstract init(): Promise<void>;

    public dispose(): void {
        this.stop();
        this.disposables.forEach(d => d.dispose());
    }
}

export class ProcessServerProxyInstance extends AbstractServerProxyInstance {
    constructor(
        public readonly id: string,
        public readonly context: any,
        public readonly serverProxyId: string,
        public readonly port: number,
        private readonly validationUrl: string,
        private readonly process: RawProcess
    ) {
        super(id, context, serverProxyId, port);

        this.disposables.push(process.onClose(() => {
            this.setStatus(StatusId.stopped);
        }));

        this.disposables.push(process.onError((e: Error) => {
            this.setStatus(StatusId.errored, e.message);
        }));
    }

    private isAccessible(): Promise<Boolean> {
        return new Promise((resolve) => {
            const request = http.get(this.validationUrl);

            request.on('error', () => resolve(false));
            request.on('response', (msg) => {
                const code = msg.statusCode;
                if (!code || code < 200 || code >= 400) {
                    return resolve(false);
                }

                resolve(true);
            });
        });
    }

    private async doStop(signal?: NodeJS.Signals): Promise<boolean> {
        const timeout = 10_000;

        this.setStatus(StatusId.stopping)
        this.process.kill(signal);

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

    public override async stop(): Promise<boolean> {
        if (ServerProxyInstanceStatus.isCompleted(this.status)) {
            return true;
        }

        await this.doStop();
        if (this.process.killed) {
            return true;
        }

        return await this.doStop('SIGKILL');
    }

    public override async init(): Promise<void> {
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
}
