'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

import * as repoStatusView from '../comp/repoStatusView';
import * as ext from '../extension';
import * as repoParser from '../util/repoParser';
import * as cli from '../client/client';
import * as urlUtil from '../util/urlUtil';
import * as constant from '../util/const';
import * as pftUtil from '../util/platformUtil';
import * as cmnUtil from '../util/commonUtil';
import * as repoInfo from '../function/info';
import { checkConfiguratoin } from '../function/config';
import { updateSingleRepoInfo } from '../function/info';

let pageId = urlUtil.getId();

let provider: repoStatusView.RepoStatusContentProvider = null;

export function updateSingleRepoStatus(
    linuxWorkingDir: string, callback?: (...args: any[]) => void) {

    cli.getInstance().doRepoStatus(linuxWorkingDir, 48, true).then(
        (output: string[]) => {
            if (output[0]) {
                let status = repoParser.parseRepoStatus(output[0]);
                if (status.size > 0) {
                    status.forEach(function (val, proj) {
                        cmnUtil.showMessage(ext.Global.repoChannel, `updating ${proj} status`);
                        let prev = JSON.stringify(ext.Global.codebaseStatus.get(proj));
                        if (val && (<Array<Object>>val['changes']).length > 0) {
                            ext.Global.codebaseStatus.set(proj, val);
                        } else {
                            let repo = repoParser.genRepoStatus(proj);
                            repo["branch"] = val["branch"];
                            ext.Global.codebaseStatus.set(proj, repo);
                        }
                        cmnUtil.showConsoleMessage(`replace ${prev} with ${JSON.stringify(val)}`);
                    });
                } else {
                    if (ext.Global.codebaseInfo.hasOwnProperty(linuxWorkingDir)) {
                        let relDir = linuxWorkingDir.substr(ext.Global.realpath.length + 1);
                        ext.Global.codebaseStatus.delete(`${relDir}/`);
                    }
                }
            } else {
                cmnUtil.showMessage(ext.Global.repoChannel, output[1]);
            }
            if (callback) {
                callback(linuxWorkingDir);
            } else {
                provider.update(vscode.Uri.parse(`${provider.previewUri}?id=${pageId}`));
            }
        },
        (reason) => {
            ext.Global.repoChannel.show();
            cmnUtil.showMessage(ext.Global.repoChannel, reason);
        }
    );
}

function refreshAll(refresh: string) {
    if (!checkConfiguratoin()) return;

    if (refresh && refresh == "1") {
        provider.renderLoading(pageId);
        // force update info in advance
        repoInfo.refreshAllInfo(refresh);
        cli.getInstance().doRepoStatus(ext.Global.realpath, 24, false).then(
            (status: string[]) => {
                if (status[0]) {
                    try {
                        ext.Global.codebaseStatus.clear();
                        let repoStatusMap = repoParser.parseRepoStatus(status[0]);
                        repoStatusMap.forEach((val, key) => {
                            let p = cmnUtil.getProjRealPath(key);
                            if (p.indexOf(ext.Global.realpath) > -1) {
                                cmnUtil.showConsoleMessage(p);
                                ext.Global.codebaseStatus.set(key, val);
                            }
                        });
                    } catch (err) {
                        cmnUtil.showErrorMessage(`${status[0]}\n${err.stack}`, `Fail to parse repo status output!`);
                    }
                } else {
                    cmnUtil.showErrorMessage(status[1], `Repo status exit with error...`);
                }
                provider.renderFinishLoading(pageId);
            },
            (error) => {
                provider.renderFinishLoading(pageId);
                cmnUtil.showErrorMessage(`${error.stack}`, `Fail to get repo status output! Check output channel for more detail...`);
            }
        );
    } else {
        provider.navigate(pageId);
    }
}

function refreshCurrent() {
    if (!checkConfiguratoin()) return;

    provider.renderLoading(pageId);
    let tmpMap = {};

    let onFinish = (...args: any[]) => {
        tmpMap[args[0]] = true;
        let allDone = true;
        cmnUtil.getObjectKey(tmpMap).forEach((v, idx) => {
            if (!tmpMap[v]) {
                allDone = false;
            }
        });

        if (allDone) {
            provider.renderFinishLoading(pageId);
        }
    };

    if (ext.Global.codebaseStatus.size == 0) {
        provider.renderFinishLoading(pageId);
    } else {
        ext.Global.codebaseStatus.forEach((v, idx) => {
            let projPath = cmnUtil.getProjRealPath(v.project);
            tmpMap[projPath] = false;
            updateSingleRepoStatus(projPath, onFinish);
        });
    }
}

export function activate(context) {
    provider = new repoStatusView.RepoStatusContentProvider(context);
    let registration = vscode.workspace.registerTextDocumentContentProvider(provider.scheme, provider);
    context.subscriptions.push(provider, registration);

    context.subscriptions.push(vscode.commands.registerCommand(constant.cmd.showStatus, refreshAll));
    context.subscriptions.push(vscode.commands.registerCommand(constant.cmd.updateStatus, refreshCurrent));
    context.subscriptions.push(vscode.commands.registerCommand(constant.cmd.openProject, provider.openProject, provider));


    vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (!checkConfiguratoin()) return;
        try {
            let linuxFile = (pftUtil.isLinux()) ? e.fileName : cmnUtil.composeLinuxPath(e.fileName);
            let linuxWorkingDir = path.posix.dirname(linuxFile);
            cmnUtil.showConsoleMessage(`updateing ${linuxWorkingDir}`);
            updateSingleRepoInfo(linuxWorkingDir, updateSingleRepoStatus, linuxWorkingDir);

        } catch (err) {
            cmnUtil.showErrorMessage(err);
        }
    });
}