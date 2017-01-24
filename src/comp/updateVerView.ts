'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

import * as request from 'request';

import * as ext from '../extension';
import * as sysmsg from '../msg/message';
import { parseRepoInfo, parseRepoInfoAsync } from '../util/repoParser';
import * as baseView from './baseView';
import * as pfutil from '../util/platformUtil';
import * as constant from '../util/const';




export class VersionSwitchView extends baseView.BaseContentProvider {

    private brs: string[];
    private vrs: string[];
    private repoChannel: vscode.OutputChannel;

    constructor(private context) {
        super();
        this.repoChannel = ext.Global.repoChannel;
        this.title = `Switch Version`;
        this.scheme = "version-switch";
        this.previewUri = `${this.scheme}://version-switch`;
    }

    private renderHeader(): string {
        return `
            <head>
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'css', 'bootstrap.min.css'))}" >
                <link rel="stylesheet" href="${this.getScriptFilePath(path.join('jq-chosen', 'chosen.min.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath(path.join('font-awesome-4.7.0', 'css', 'font-awesome.min.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath(path.join('versionswitch.css'))}" >
                
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('jquery', 'dist', 'jquery.min.js'))}"></script>              
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'js', 'bootstrap.min.js'))}"></script>
                <script type="text/javascript" src="${this.getScriptFilePath(path.join('jq-chosen', 'chosen.jquery.min.js'))}"></script>
                <script type="text/javascript" src="${this.getScriptFilePath(path.join('versionswitch.js'))}"></script>
                
            </head>
        `;
    }

    private renderVersionSelection(errMsg: string = ""): string {
        if (errMsg) {
            return errMsg.replace("\n", "<br>");
        }

        let view = fs.readFileSync(this.getHtmlFilePath('version.html')).toString();

        let refreshCmd = vscode.Uri.parse(`command:${constant.cmd.getcodeGui}?${JSON.stringify(["1"])}`);
        view = view.replace(/\${refreshCmd}/g, refreshCmd.toString());
        view = view.replace(/\${dataline}/g, "");
        var msg = `${this.renderHeader()}
                    ${view}`;
        return msg;
    };


    private switch(root): string | Thenable<string> {
        return this.renderVersionSelection();

    }

    createSnippet(uri: vscode.Uri): string | Thenable<string> {
        console.log("updating %s", uri.toString());
        return this.switch(ext.Global.realpath);
    }

}