'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

import * as repoUploadView from '../comp/repoUploadView';
import * as cli from '../client/client';
import * as urlUtil from '../util/urlUtil';
import * as constant from '../util/const';
import * as ext from '../extension';
import { updateSingleRepoStatus } from '../function/status';
import * as cmnUtil from '../util/commonUtil';
import * as msg from '../msg/message';

let provider: repoUploadView.RepoUploadContentProvider = null;
let pageId: string = "";

const commitMsg: string = `[Detail]

[Solution]

`;

function checkFinish(mountPath: string, allDone: boolean[]) {
    updateSingleRepoStatus(mountPath);

    if (allDone.some((x: boolean) => { return x == null; })) {
        console.log("waiting for upload complete");
        return;
    }

    let keys = cmnUtil.getObjectKey(provider.selectedProjInfo);
    let cnt = keys.length;
    keys.forEach((v, idx) => {
        if (allDone[idx]) {
            delete provider.selectedProjInfo[v];
            provider.selectedProjStatus.delete(v);
        }
    });

    provider.renderFinishLoading(pageId);

    let undoneKeys = cmnUtil.getObjectKey(provider.selectedProjInfo);
    if (undoneKeys.length == 0) {
        provider.selectedProjInfo = {};
        vscode.window.showInformationMessage(`Successfully uploaded!`);
        cmnUtil.closeCurActivateDoc();
    }
    else {
        ext.Global.repoChannel.show();
        if (undoneKeys.length == cnt) {
            vscode.window.showErrorMessage(`Fail to upload! Check the output channel for more detail!`);
        }
        else {
            vscode.window.showWarningMessage(`Partial failed! Check the output channel for more detail!`);
        }
    }
}

function validateInput(proj: string, uploadingRepos: any): boolean {
    if (!uploadingRepos.hasOwnProperty(proj)) {
        cmnUtil.showErrorMessage(`Project mismatched: \n
Selected: ${JSON.stringify(cmnUtil.getObjectKey(provider.selectedProjInfo))} <---> Uploaded: ${JSON.stringify(cmnUtil.getObjectKey(uploadingRepos))}`,
            `Project mismatched! Upload projects are different from selected projects!`);
        return false;
    }
    if (!uploadingRepos[proj].hasOwnProperty(constant.localBranch) || !uploadingRepos[proj][constant.localBranch]) {
        vscode.window.showErrorMessage(`Please enter local branch of Project[${proj}]`);
        return false;
    }
    if (!uploadingRepos[proj].hasOwnProperty(constant.remoteBranch) || !uploadingRepos[proj][constant.remoteBranch]) {
        vscode.window.showErrorMessage(`Please enter remote branch of Project[${proj}]`);
        return false;
    }
    if (!uploadingRepos[proj].hasOwnProperty(constant.message) || !uploadingRepos[proj][constant.message]) {
        vscode.window.showErrorMessage(`Please enter commit message of Project[${proj}]`);
        return false;
    }
    return true;
}

function initFormModel(): any {
    return {
        localBranch: "", remoteBranch: "", crId: "", feature: "", message: commitMsg, isAmendToggled: false,
        isChange: false, changeId: ""
    };
}

export function repoUpload(uploadStr: string) {
    try {
        let buf = urlUtil.decodeBase64(uploadStr);
        let uploadingRepos: Object = JSON.parse(buf.toString());

        if (cmnUtil.getObjectKey(uploadingRepos).length == 0) {
            vscode.window.showWarningMessage(msg.WARN_NO_REPO_TO_UPLOAD);
            return;
        }

        // data validation
        let keys = cmnUtil.getObjectKey(provider.selectedProjInfo);
        for (var i = 0; i < keys.length; ++i) {
            let proj = keys[i];
            if (!validateInput(proj, uploadingRepos)) {
                return;
            }
        }
        // data model sync after validation
        provider.selectedProjInfo = JSON.parse(buf.toString());

        let uploadKeys = cmnUtil.getObjectKey(uploadingRepos);
        uploadKeys.forEach((proj: string) => {
            uploadingRepos[proj][constant.message] = `${uploadingRepos[proj][constant.message].replace("'", `'"'"'`)}

${(uploadingRepos[proj][constant.changeId]) ? `Change-Id: ${uploadingRepos[proj][constant.changeId]}` : ""}`;
        });

        provider.renderLoading(pageId);
        cli.getInstance().doBatchUplaod(cmnUtil.getObjectKey(provider.selectedProjInfo), uploadingRepos, checkFinish);

    } catch (error) {
        provider.renderFinishLoading(pageId);
        cmnUtil.showErrorMessage(error, error.stack);
    }
}

export function amendCommit(proj: string, isAmendToggled: boolean) {

    provider.selectedProjStatus.get(proj)[constant.isAmendToggled] = !isAmendToggled;
    provider.selectedProjInfo[proj][constant.isAmendToggled] = !isAmendToggled;
    let url = `${provider.previewUri}?id=${pageId}`;

    if (!isAmendToggled) {
        try {
            provider.renderLoading(pageId);

            let key = cmnUtil.getProjRealPath(proj);
            let mountPath: string = ext.Global.codebaseInfo[key]['mount-path'];

            cli.getInstance().doGitLog(mountPath, `-1 --format="%s%n%n%b"`).then(
                (msgs: string[]) => {
                    var msg = "", crId = "", feature = "", chgId = "";
                    var ft = /^Feature:\s*(\S*)/g;
                    var chg = /^Change-Id:\s*(\S*)/g;
                    var sto = msgs[0].split("\n");
                    sto.forEach((val, idx) => {
                        var res = ft.exec(val);
                        if (res) {
                            feature = res[1];
                            return;
                        }
                        res = chg.exec(val);
                        if (res) {
                            chgId = res[1];
                            return;
                        }
                        msg += `${val}${(idx == sto.length - 1) ? "" : "\n"}`;
                    });
                    provider.selectedProjInfo[proj][constant.message] = msg;
                    provider.selectedProjInfo[proj][constant.changeId] = chgId;

                    provider.renderFinishLoading(pageId);
                },
                (msgs: string[]) => {
                    provider.renderFinishLoading(pageId);
                    vscode.window.showErrorMessage(`fail to get log message: ${msgs[1]}`);
                }
            );
        } catch (err) {
            provider.renderFinishLoading(pageId);
            cmnUtil.showMessage(ext.Global.repoChannel, err, true);
        }

    } else {
        provider.selectedProjInfo[proj] = initFormModel();
        provider.update(vscode.Uri.parse(url));
    }
}

function genUploadForm(...projects: string[]) {
    console.log(`generating upload changes ...`);

    pageId = urlUtil.getId();
    provider.selectedProjInfo = {};
    provider.selectedProjStatus = new Map();

    projects.forEach((v, i) => {
        let status: Object = ext.Global.codebaseStatus.get(v);
        status[constant.isAmendToggled] = false;
        provider.selectedProjInfo[v] = initFormModel();
        provider.selectedProjStatus.set(v, status);
    });
    let uri: string = `${provider.previewUri}?id=${pageId}`;
    provider.navigate(null, uri);
}

export function activate(context: vscode.ExtensionContext) {
    provider = new repoUploadView.RepoUploadContentProvider(context);
    let registration = vscode.workspace.registerTextDocumentContentProvider(provider.scheme, provider);

    context.subscriptions.push(provider, registration);
    context.subscriptions.push(vscode.commands.registerCommand(constant.cmd.upload, genUploadForm));
    context.subscriptions.push(vscode.commands.registerCommand(constant.cmd.amendCommit, amendCommit));
    context.subscriptions.push(vscode.commands.registerCommand(constant.cmd.uploadSbumt, repoUpload));

}