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

import { ContainerModule, injectable, interfaces } from 'inversify';
import { IFrameWidget, IFrameWidgetMode, IFrameWidgetOptions } from './iframe-widget';

import '../../src/browser/style/index.css';
import { AbstractViewContribution, FrontendApplicationContribution, KeybindingContribution, OpenViewArguments, ViewContainer, ViewContributionOptions, Widget, WidgetFactory, WidgetManager } from '@theia/core/lib/browser';
import { IFrameStatus } from './iframe-status';
import { CommandContribution, MenuContribution } from '@theia/core';
import { inject } from '@theia/core/shared/inversify';

export namespace IFramePanel {
    export const ID: string = "iframe.panel";

    export const VIEW_ID: string = "frame.panel.view";
}

export const IFramePanelOptions = "IFramePanelOptions"
export interface IFramePanelOptions {
    readonly id: string,
    readonly name: string,
    readonly url: string,
    readonly icon: string
};

export const IFramePanelSettings = "IFramePanelSettings"
export interface IFramePanelSettings {
    get(): IFramePanelOptions[]
}

@injectable()
class IFramePanelSettingsHardcoded implements IFramePanelSettings {
    get(): IFramePanelOptions[] {
        return [{
            id: "foo",
            name: "Example",
            url: "http://www.example.com",
            icon: "fa fa-bath"
        }, {
            id: "foo2",
            name: "Google",
            url: "http://www.google.com",
            icon: "fa fa-git"
        }];
    }
}

// https://fontawesome.com/v4.7/icons/

export abstract class AbstractViewWithOptionsContribution<T extends Widget> extends AbstractViewContribution<T> {
    constructor(
        protected readonly options: ViewContributionOptions,
        protected readonly widgetOptions: any
    ) {
        super(options);
    }

    get widget(): Promise<T> {
        return this.widgetManager.getOrCreateWidget(this.viewId, this.widgetOptions);
    }

    tryGetWidget(): T | undefined {
        return this.widgetManager.tryGetWidget(this.viewId, this.widgetOptions);
    }

    async openView(args: Partial<OpenViewArguments> = {}): Promise<T> {
        const shell = this.shell;
        const widget = await this.widgetManager.getOrCreateWidget(this.options.viewContainerId || this.viewId, this.widgetOptions);
        const tabBar = shell.getTabBarFor(widget);
        const area = shell.getAreaFor(widget);
        if (!tabBar) {
            // The widget is not attached yet, so add it to the shell
            const widgetArgs: OpenViewArguments = {
                ...this.defaultViewOptions,
                ...args
            };
            await shell.addWidget(widget, widgetArgs);
        } else if (args.toggle && area && shell.isExpanded(area) && tabBar.currentTitle === widget.title) {
            // The widget is attached and visible, so collapse the containing panel (toggle)
            switch (area) {
                case 'left':
                case 'right':
                    await shell.collapsePanel(area);
                    break;
                case 'bottom':
                    // Don't collapse the bottom panel if it's currently split
                    if (shell.bottomAreaTabBars.length === 1) {
                        await shell.collapsePanel('bottom');
                    }
                    break;
                default:
                    // The main area cannot be collapsed, so close the widget
                    await this.closeView();
            }
            return this.widget;
        }
        if (widget.isAttached && args.activate) {
            await widget.activate();
        }

        return this.widget;
    }
}

@injectable()
export class IFramePanelViewContribution extends AbstractViewWithOptionsContribution<Widget> {
    constructor(
        @inject(IFramePanelOptions) options: IFramePanelOptions
    ) {
        super({
            widgetId: IFramePanel.VIEW_ID,
            widgetName: options.name,
            toggleCommandId: `${options.id}:toggle`,
            defaultWidgetOptions: {
                area: 'left',
                rank: 500
            }
        }, options);
    }
}

export class IFramePanelFrontendContribution implements FrontendApplicationContribution {
    constructor(
        protected readonly panels: IFramePanelViewContribution[]
    ) {
    }

    async initializeLayout(): Promise<void> {
        this.panels.forEach(async p => {
            await p.openView();
        });
    }
}

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(IFramePanelSettings).to(IFramePanelSettingsHardcoded).inSingletonScope();

    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: IFramePanel.ID,
        createWidget: (panelOptions: IFramePanelOptions) => {
            const widgetManager = ctx.container.get<WidgetManager>(WidgetManager);
            const widgetOptions: IFrameWidgetOptions = {
                id: panelOptions.id,
                name: panelOptions.id,
                startUrl: panelOptions.url,
                mode: IFrameWidgetMode.IFrame,
                status: IFrameStatus.ready
            };

            return widgetManager.getOrCreateWidget(IFrameWidget.ID, widgetOptions);
        }
    }));

    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: IFramePanel.VIEW_ID,
        createWidget: async (options: IFramePanelOptions) => {
            const viewContainer = container.get<ViewContainer.Factory>(ViewContainer.Factory)({
                id: IFramePanel.VIEW_ID,
            });

            viewContainer.title.label = options.name;
            viewContainer.title.closable = false
            viewContainer.title.iconClass = options.icon;

            // viewContainer.setTitleOptions(SCM_VIEW_CONTAINER_TITLE_OPTIONS);
            const widget = await container.get(WidgetManager).getOrCreateWidget(IFramePanel.ID, options);

            viewContainer.addWidget(widget, {
                canHide: false,
                initiallyCollapsed: false
            });

            viewContainer.getPartFor(widget)?.hideTitle();
            viewContainer.id = options.id;

            return viewContainer;
        }
    })).inSingletonScope();


    bind(IFramePanelViewContribution).toSelf();
    bind(FrontendApplicationContribution).toDynamicValue((context) => {
        const { container } = context;

        const allOptions = container.get<IFramePanelSettings>(IFramePanelSettings).get()
        const contributions = allOptions.map(options => {
            const child = container.createChild();
            child.bind(IFramePanelOptions).toConstantValue(options)
            const viewContribution = child.get(IFramePanelViewContribution);

            bind(CommandContribution).toConstantValue(viewContribution);
            bind(KeybindingContribution).toConstantValue(viewContribution);
            bind(MenuContribution).toConstantValue(viewContribution);

            return viewContribution;
        });
        return new IFramePanelFrontendContribution(contributions);
    }).inSingletonScope();


    bind(IFrameWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: IFrameWidget.ID,
        async createWidget(options: IFrameWidgetOptions): Promise<IFrameWidget> {
            const { container } = context;

            const child = container.createChild();
            child.bind(IFrameWidgetOptions).toConstantValue(options);

            return child.get(IFrameWidget);
        }
    })).inSingletonScope();
});
