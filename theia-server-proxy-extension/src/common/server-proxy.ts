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

export interface ServerProxy {
    id: string
    name: string
}

export enum StatusId {
    starting = "starting",
    waitingForPort = "waiting-for-app",
    started = "started",
    stopping = "stopping",
    stopped = "stopped",
    errored = "errored"
}

export interface ServerProxyInstanceStatus {
    instanceId: string
    timeMs: number
    statusId: StatusId
    statusMessage?: string
}

export interface ServerProxyInstance {
    id: string
    serverProxyId: string
    context: string
    port: number
    lastStatus: ServerProxyInstanceStatus
}

export namespace StatusId {
    export function isCompleted(statusId: StatusId): boolean {
        return statusId == StatusId.stopped || statusId == StatusId.errored || statusId == StatusId.stopping;
    }
    export function isLoading(statusId: StatusId): boolean {
        return statusId == StatusId.starting || statusId == StatusId.waitingForPort;
    }
    export function isRunning(statusId: StatusId): boolean {
        return statusId == StatusId.started;
    }
}

export namespace ServerProxyInstanceStatus {
    export function isCompleted(status: ServerProxyInstanceStatus): boolean {
        return StatusId.isCompleted(status.statusId);
    }
    export function isLoading(status: ServerProxyInstanceStatus): boolean {
        return StatusId.isLoading(status.statusId);
    }
    export function isRunning(status: ServerProxyInstanceStatus): boolean {
        return StatusId.isRunning(status.statusId);
    }
}
