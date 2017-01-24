'use strict';

import * as vscode from 'vscode';
import * as util from 'util';

import * as uuid from 'node-uuid';

import * as repoInfoView from '../comp/repoInfoView';
import * as cli from '../client/client';
import * as ext from '../extension';
import * as urlUtil from '../util/urlUtil';
import { parseRepoInfo } from '../util/repoParser';
import { checkConfiguratoin } from '../function/config';
import * as constant from '../util/const';
import * as cmnUtil from '../util/commonUtil';

let pageId = urlUtil.getId();
let provider: repoInfoView.InfoViewProvider = null;

export function updateSingleRepoInfo(linuxWorkDir: string, callback?: any, ...args: any[]) {
    cli.getInstance().doRepoInfo(linuxWorkDir, true).then(
        (message: string[]) => {
            let repos: Object[] = parseRepoInfo(message[0]);
            repos.forEach((val, idx) => {
                if (val['mount-path']) {
                    ext.Global.codebaseInfo[val['mount-path']] = val;
                }
            });
            if (callback) {
                try {
                    callback.call(this, args);
                } catch (error) {
                    cmnUtil.showErrorMessage(`Fail to execute call after repo info: ${error}`);
                }
            }
            provider.update(vscode.Uri.parse(`${provider.previewUri}?id=${pageId}`));
        },
        (reason) => {
            cmnUtil.showErrorMessage(`Fail to update repo info[${linuxWorkDir}]: ${reason}`);
        }
    );
}

export function refreshAllInfo(refresh: string) {
    if (!checkConfiguratoin()) return;

    if (refresh && refresh == "1") {
        provider.renderLoading(pageId);
        ext.Global.codebaseInfo = {};
        cli.getInstance().doRepoInfo(ext.Global.realpath, false).then((info: string[]) => {
            if (info[0]) {
                let repos: Object[] = parseRepoInfo(info[0]);
                repos.forEach((val, idx) => {
                    if (val['mount-path']) {
                        ext.Global.codebaseInfo[val['mount-path']] = val;
                    }
                });
            } else {
                cmnUtil.showErrorMessage(`Fail to get repo info : ${info[1]}`);
            }

            provider.renderFinishLoading(pageId);
        }, (reason) => {
            cmnUtil.showErrorMessage(`Fail to perform repo info : ${reason}`);
            provider.renderFinishLoading(pageId);
        });
    } else {
        provider.navigate(pageId)
    }
}

export function activate(context) {

    provider = new repoInfoView.InfoViewProvider(context);
    let registration = vscode.workspace.registerTextDocumentContentProvider(provider.scheme, provider);

    let disposable = vscode.commands.registerCommand(constant.cmd.showInfo, refreshAllInfo);

    context.subscriptions.push(disposable, registration, provider);
}

