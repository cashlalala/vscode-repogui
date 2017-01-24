import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import * as urlUtil from '../src/util/urlUtil';


suite("url utility test", function () {
    test("diff path", function () {
        let a = `/a/b/c/tk_head/abi/cpp`.split('/'),
            b = `abi/cpp`.split('/');
        let obj = urlUtil.diff(a, b);

        assert.equal(obj.join("/"), "/a/b/c/tk_head");
    });

    test("diff path & join ", function () {
        let a = `/a/b/c/tk_head/abi/cpp`.split('/'),
            b = `abi/cpp/test`.split('/');
        let obj = urlUtil.diff(a, b);
        let obj2 = urlUtil.diff(b, a);
        obj.push(obj2)
        assert.equal(obj.join("/"), "/a/b/c/tk_head/test");
    });
});
