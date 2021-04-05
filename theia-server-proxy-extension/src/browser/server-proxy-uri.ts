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

import { Path } from "@theia/core";
import URI from "@theia/core/lib/common/uri";

export const scheme: string = "server-proxy";

// TODO 1 is this the right way?
export const buildUri = (serverProxyId: string, path: Path) =>
    new URI()
        .withScheme(scheme)
        .withAuthority(serverProxyId)
        .withPath(path);

export const parseUri = (uri: URI) => {
    if (uri.scheme != scheme) {
        return undefined;
    }

    const serverProxyId = uri.authority;

    const path = uri.path.toString();

    if (!serverProxyId || !path) {
        return undefined;
    }

    return {
        serverProxyId,
        path
    };
};
