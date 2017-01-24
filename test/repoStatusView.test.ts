import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as repoStatusViewer from '../src/comp/repoStatusView';


suite("Repos Status View", function () {
    test("Repos Status View", function () {


        let viewer = new repoStatusViewer.RepoStatusContentProvider(null);

        let cssPath: string = viewer.getStyleSheetPath("custom.css");
        console.info(cssPath);
        cssPath = cssPath.replace("%3A", ":");
        cssPath = cssPath.replace("file:///", "");
        console.info(cssPath);

        assert.equal(true, fs.existsSync(cssPath));
    }

    );
});
