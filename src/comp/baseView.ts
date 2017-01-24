'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

import * as cmnUtil from '../util/commonUtil';

export abstract class BaseContentProvider implements vscode.TextDocumentContentProvider {

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    dispose() {
        this._onDidChange.dispose();
    }

    public title: string;
    public scheme: string;
    public previewUri: string;


    public getStyleSheetPath(resourceName: string): string {
        return vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'resources', 'css', resourceName)).toString();
    }

    public getScriptFilePath(resourceName: string): string {
        return vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'resources', 'js', resourceName)).toString();
    }

    public getHtmlFilePath(resourceName: string): string {
        return path.join(__dirname, '..', '..', '..', 'resources', 'html', resourceName);
    }

    public getNodeModulesPath(resourceName: string): string {
        return vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'node_modules', resourceName)).toString();
    }


    public provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        return this.createSnippet(uri);
    }

    abstract createSnippet(uri: vscode.Uri): string | Thenable<string>;

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

    public navigate(pageId: string, cmd?: string): any {

        if (!cmd) {
            cmd = `${this.previewUri}?id=${pageId}`;
        }
        return vscode.commands.executeCommand('vscode.previewHtml', vscode.Uri.file(this.getHtmlFilePath("cache.html")),
            vscode.ViewColumn.One, this.title).then(
            (success) => {
                cmnUtil.closeCurActivateDoc();

                return vscode.commands.executeCommand('vscode.previewHtml', vscode.Uri.parse(cmd),
                    vscode.ViewColumn.One, this.title).then(
                    (success) => { },
                    (reason) => {
                        vscode.window.showErrorMessage(reason);
                    });

            },
            (reason) => {
                vscode.window.showErrorMessage(reason);
            }
            );
    }
}