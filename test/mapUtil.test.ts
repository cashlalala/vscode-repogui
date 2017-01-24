import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import * as mapUtil from '../src/util/mapUtil';


suite("map utility test", function () {
    test("map to json", function () {

        let m1 = new Map();
        let obj = {'branch': 'n0tk', 'changes' : {'aa.js': 'm', 'bb.js': 'a'} };
        m1.set('abi/cpp', obj);


        let viewer = mapUtil.strMapToJson(m1);

        console.log(viewer);

        // assert.equal(true, fs.existsSync(cssPath));
    });
});
