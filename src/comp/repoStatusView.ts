'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import * as ext from '../extension';
import { parseRepoStatus } from '../util/repoParser';
import * as sysmsg from '../msg/message';
import * as baseView from './baseView';
import * as urlUtil from '../util/urlUtil';
import * as constant from '../util/const';
import * as cmnUtil from '../util/commonUtil';

export function renderMasonryRepoStatus(repoStatusMap: Map<string, Object>,
    check: boolean = true, upload: boolean = true, stage: boolean = false, amend?: boolean): string {

    let dataline = ``;
    const maxHeight = 4; // line
    const maxWidth = 19; // char

    repoStatusMap.forEach((repoStatus, project: string) => {
        let cls = "",
            prjCmd = encodeURI('command:repotool-cmd:openproject?' + JSON.stringify([`${cmnUtil.getProjWorkspacePath(project)}`])),
            prjCls = "",
            refresh = "",
            rfsCLs = "",
            fileCmd = "",
            filesHtml = "",
            height = 2, // at least project & branch;
            width = (project.length > repoStatus['branch'].length) ? project.length : repoStatus['branch'].length;

        repoStatus['changes'].forEach((change, idx) => {
            let single: string = `
                        <li class="list-group-item">
                                ${change['file']} <span class="badge"> ${change['status']}</span>
                        </li>`;
            width = (width > single.length) ? width : ((change['file'] + change['status']).length + 10);
            filesHtml += single;
            height += 1;
        });

        let htimes = Math.floor(height / maxHeight) + ((height % maxHeight) ? 1 : 0);
        let wtimes = Math.floor(width / maxWidth) + ((width % maxWidth) ? 1 : 0);

        cls = "grid-item " + ((htimes == 2) ? "grid-item--height2 " :
            (htimes == 3) ? "grid-item--height3 " : (htimes == 4) ? "grid-item--height4 " : "") +
            ((wtimes == 2) ? "grid-item--width2 " : (wtimes == 3) ? "grid-item--width3 " :
                (wtimes == 4) ? "grid-item--width4 " : "");

        let projBtnCls = ((wtimes == 2) ? "wrap-title-word-2" : (wtimes == 3) ? "wrap-title-word-3" : (wtimes == 4) ? "wrap-title-word-4" : "wrap-title-word");

        let projHtml = `
                        <div class="${cls}" >
                                <div class="proj-name">
                                    <a class=" btn btn-info ${prjCls} ${projBtnCls}" href="${prjCmd}">${project}</a>
                                </div>
                                ${(check) ?
                `<div class="btn-grp-right-up-align checkbox checkbox-primary " >
                                        <input type="checkbox" class="styled sel-proj-chb">
                                        <label />
                                    </div>` : ""}
                                <span>${repoStatus["branch"]}</span>
                                <ul class="list-group" >${filesHtml}</ul>
                                <div class="btn-group pull-right btn-grp-bottom-align" >
                                ${ (stage) ? `
                                    <a class="btn btn-default btn-sm " >
                                        <i class="fa icon-plus-square" data-toggle="tooltip" title="stage all"></i> 
                                    </a>` : ""}
                                ${ (upload) ?
                `<a class="btn btn-default btn-sm upload-all-cls" data-toggle="tooltip" title="Upload to gerrit">
                                        <i class="fa icon-upload " ></i> 
                                    </a>` : ""}
                                ${(amend) ?
                `<a class="btn btn-default btn-sm amend-last ${(repoStatus['isAmendToggled']) ? "active" : ""}" 
                                        id="${urlUtil.encodeBase64(project)}"
                                        data-toggle="tooltip" title="Amend last commit"
                                        href=${vscode.Uri.parse(`command:${constant.cmd.amendCommit}?${JSON.stringify([project, repoStatus['isAmendToggled']])}`)} >
                                        <i class="fa fa-pencil " ></i> 
                                    </a>`: ""}
                                </div>
                        </div>`;

        dataline += projHtml;
    });

    return `<div class="grid" data-masonry='{ "itemSelector": ".grid-item", "columnWidth": 180 }'>${dataline}</div>`;
}


export class RepoStatusContentProvider extends baseView.BaseContentProvider {

    public isLoading: boolean = false;

    constructor(private context) {
        super();
        this.scheme = 'status-preview';
        this.previewUri = `${this.scheme}://authority/repo-status-preview/`;
        this.title = 'Current Codebase Status';
    }

    public renderLoading(id: string) {
        this.isLoading = true;
        this.update(vscode.Uri.parse(`${this.previewUri}?id=${id}`));
    }

    public renderFinishLoading(id: string) {
        this.isLoading = false;
        this.update(vscode.Uri.parse(`${this.previewUri}?id=${id}`));
    }

    private renderStatus(error: string = ""): string {
        if (error) {
            return error.replace("\n", "<br>");
        }

        let dataline = renderMasonryRepoStatus(ext.Global.codebaseStatus);
        let refreshCmd = vscode.Uri.parse(`command:${constant.cmd.showStatus}?${JSON.stringify(["1"])}`);
        let updateCmd = vscode.Uri.parse(`command:${constant.cmd.updateStatus}`);
        let msg = `<head>
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('jquery-ui-dist', 'jquery-ui.min.css'))}" >
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'css', 'bootstrap.min.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath(path.join('custom', 'styles.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath(path.join('font-awesome-4.7.0', 'css', 'font-awesome.min.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('checkbox.css')}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('loading.css')}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('custom.css')}" >
                

                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('jquery', 'dist', 'jquery.min.js'))}"></script>
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('jquery-ui-dist', 'jquery-ui.min.js'))}"></script>
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('masonry-layout', 'dist', 'masonry.pkgd.min.js'))}"></script>              
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'js', 'bootstrap.min.js'))}"></script>
                <script type="text/javascript" src="${this.getScriptFilePath(path.join('bootstrap-waitingfor-1.2.4', 'build', 'bootstrap-waitingfor.min.js'))}"></script>
                <script type="text/javascript">
                    var isLoading = ${JSON.stringify(this.isLoading)};
                    $(document).ready(function(){
                        if (isLoading){
                            $("#loadingDlg").modal();
                        }
                    });
                </script>
                <script type="text/javascript" src="${this.getScriptFilePath('showstatus.js')}"></script>
            </head>
            <body>
                <div class="row" style="margin:10px;">
                    <div class="col-md-11"></div>
                    <div class=" col-md-1" >
                        <div class="btn-group">
                            <a href="${updateCmd}" class="btn btn-primary" data-placement="bottom" id="updateCur" class="" data-toggle="tooltip" title="Update-Current-Projects (quicker)">
                                <i class="fa fa-arrow-circle-o-up " aria-hidden="true" ></i>
                            </a>
                            <a href="${refreshCmd}" class="btn btn-primary" data-placement="bottom" id="refreshAll" data-toggle="tooltip" title="Refresh-Codebase! (slower)">
                                <i class="fa fa-refresh" aria-hidden="true"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div id="loadingDlg" class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">
                    <div class="modal-dialog modal-m">
                        <div id="ide-loader" ></div>
                    </div>
                </div>
                <div id="codebaseStatus" style="margin:10px;">${dataline}</div>
            </body>`;

        // cmnUtil.showConsoleMessage(msg, ext.Global.repoChannel, false);
        return msg;
    }

    createSnippet(uri: vscode.Uri): string | Thenable<string> {
        cmnUtil.showConsoleMessage("updating " + uri.toString());
        return this.renderStatus();
    }

    public openProject(dir: string) {
        fs.readdir(dir, (err, files: string[]) => {
            if (files.length == 0) {
                vscode.window.showInformationMessage("No file to open!");
            } else {
                for (var i = 0; i < files.length; ++i) {
                    let fullpt: string = path.join(dir, files[i]);
                    let st = fs.statSync(fullpt);
                    if (st.isFile()) {
                        cmnUtil.showMessage(ext.Global.repoChannel, `opening ${fullpt}..`, true);
                        vscode.workspace.openTextDocument(fullpt).then((doc: vscode.TextDocument) => {
                            vscode.window.showTextDocument(doc, 1, true).then(() => {
                                cmnUtil.showConsoleMessage(`successfully opened ${doc.fileName}`);
                                return;
                            }, (reason) => {
                                console.error(reason);
                            });
                        }, (reason: string) => {
                            console.error(reason);
                        });
                        break;

                    }
                }
            }
        });
    }


}