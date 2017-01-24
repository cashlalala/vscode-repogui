'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';


import * as ext from '../extension';
import * as baseView from './baseView';
import * as cli from '../client/client';
import * as pfutil from '../util/platformUtil';
import * as cmnUtil from '../util/commonUtil';


export class ConfigView extends baseView.BaseContentProvider {

    constructor(private context) {
        super();
        this.title = "Repotool GUI Config";
        this.scheme = "plugin-cfg";
        this.previewUri = `${this.scheme}://plugin-cfg/setting`;
    }

    private renderHeader(): string {
        return `
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'css', 'bootstrap.min.css'))}" >
                <link rel="stylesheet" href="${this.getScriptFilePath(path.join('bootstrap-select-1.12.1', 'css','bootstrap-select.min.css'))}" >
                
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('jquery', 'dist', 'jquery.min.js'))}"></script>              
                <script type="text/javascript" src="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'js', 'bootstrap.min.js'))}"></script>
                <script type="text/javascript" src="${this.getScriptFilePath(path.join('bootstrap-select-1.12.1', 'js','bootstrap-select.min.js'))}"></script>
                <style>
                body {
                    margin: 10px;
                }
                .save-btn {
                    margin: 10px;
                }
                </style>
            </head>
        `;
    }

    private renderConfig(errMsg: string = ""): string {
        if (errMsg) {
            return errMsg.replace("\n", "<br>");
        }

        let view = fs.readFileSync(this.getHtmlFilePath('config.html')).toString();

        var msg = `${this.renderHeader()}
                    <script type="text/javascript">
                        var sysCfg=${JSON.stringify(ext.Global.config)};
                        var isWindows = ${(pfutil.isWindows()) ? "true" : "false"};
                    </script>
                   ${view}
                   <script type="text/javascript" src="${this.getScriptFilePath(path.join('config.js'))}"></script>`;
        // cmnUtil.showConsoleMessage(msg);
        return msg;
    };


    private config(root): string | Thenable<string> {
        return this.renderConfig();

    }

    createSnippet(uri: vscode.Uri): string | Thenable<string> {
        cmnUtil.showConsoleMessage("updating " + uri.toString());
        return this.config(ext.Global.realpath);
    }

}