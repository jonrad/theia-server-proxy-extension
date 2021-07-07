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

import { injectable, postConstruct } from 'inversify';

import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { ApplicationShell, FrontendApplicationContribution, KeybindingContribution, KeybindingRegistry, Widget, WidgetManager } from '@theia/core/lib/browser';
import { CommandContribution, CommandRegistry, ContributionProvider, MenuContribution, MenuModelRegistry } from '@theia/core';
import { inject, named } from '@theia/core/shared/inversify';
import { QuickViewService } from '@theia/core/lib/browser/quick-view-service';

export namespace IFramePanel {
    export const ID: string = "iframe.panel";
}

export const IFramePanelOptions = "IFramePanelOptions"
export interface IFramePanelOptions {
    readonly id: string,
    readonly name: string,
    readonly url: string,
    readonly icon?: string,
    readonly rank?: number,
    readonly keybinding?: string
};

export const IFramePanelsContribution = Symbol("IFramePanelsContribution")
export interface IFramePanelsContribution {
    get(): IFramePanelOptions[]
}

@injectable()
export class IFramePanels implements FrontendApplicationContribution, CommandContribution, MenuContribution, KeybindingContribution {
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(QuickViewService) protected readonly quickView: QuickViewService;

    protected panels: IFramePanelOptions[] = [];

    constructor(
        @inject(ContributionProvider) @named(IFramePanelsContribution)
        protected readonly contributions: ContributionProvider<IFramePanelsContribution>
    ) {
    }

    @postConstruct()
    async init(): Promise<void> {
        this.panels = this.contributions.getContributions().map(c => c.get()).reduce((acc, val) => acc.concat(val), []);
    }

    async initializeLayout(): Promise<void> {
        await Promise.all(
            this.panels.map(p => {
                return this.openView(p);
            })
        );
    }

    protected toggleId(panel: IFramePanelOptions): string {
        return `${panel.id}:toggle`;
    }

    protected async widget(panel: IFramePanelOptions): Promise<Widget> {
        return this.widgetManager.getOrCreateWidget(IFramePanel.ID, panel);
    }

    registerCommands(commands: CommandRegistry): void {
        this.panels.forEach(panel => {
            const command = {
                id: this.toggleId(panel),
                label: 'Toggle ' + panel.name + ' View'
            }

            commands.registerCommand(command, {
                execute: () => this.toggleView(panel)
            });

            this.quickView.registerItem({
                label: panel.name,
                open: () => this.toggleView(panel)
            })
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        this.panels.forEach(panel => {
            menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
                commandId: this.toggleId(panel),
                label: panel.name,
                icon: panel.icon
            });
        })
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        this.panels.forEach(panel => {
            if (panel.keybinding) {
                keybindings.registerKeybinding({
                    command: this.toggleId(panel),
                    keybinding: panel.keybinding
                });
            }
        })
    }

    async toggleView(panel: IFramePanelOptions): Promise<Widget> {
        const shell = this.shell;
        const widget = await this.widget(panel);
        const tabBar = shell.getTabBarFor(widget);
        const area = this.shell.getAreaFor(widget);
        if (!tabBar) {
            this.openView(panel);
            this.shell.revealWidget(widget.id);
        } else if (area && shell.isExpanded(area) && tabBar.currentTitle === widget.title) {
            await shell.collapsePanel(area);
        } else {
            this.shell.revealWidget(widget.id);
        }

        return widget;
    }

    async openView(panel: IFramePanelOptions): Promise<Widget> {
        const shell = this.shell;
        const widget = await this.widget(panel);
        if (!widget.isAttached) {
            await shell.addWidget(widget,
                {
                    area: 'left',
                    rank: panel.rank || 500
                });
        }

        await widget.activate();

        return widget;
    }
}
