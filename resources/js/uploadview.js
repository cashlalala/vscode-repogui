function h(e) {
    $(e).css({ 'height': 'auto', 'overflow-y': 'hidden' }).height(e.scrollHeight);
}

function b64DecodeUnicode(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

var cmdPrefix = "command:repotool-cmd:upload-confirm?";
var localKey = "upload_object";
var remoteBrKey = "remoteBranch";
var localBrKey = "localBranch";
var msgKey = "message";
var crId = "crId";
var chgId = "changeId";
var feature = "feature";
var amendKey = "isAmendToggled";
var upload = {};

$(document.body).on('appear', '.card', function () {
    $(this).addClass("appeared");
});

$('.card').appear({ 'force_process': true });

$('.card').on('disappear', function () {
    $(this).removeClass("appeared");
});

$('textarea').each(function () {
    h(this);
}).on('input', function (evt) {
    h(this);
    onInput(this);
});

$('input').on('input', function (evt) {
    onInput(this);
});

function onInput(evt) {
    try {
        var id = $(evt).attr("id");
        var type = id.slice(0, 3);
        var proj = id.slice(3);
        var val = $(evt).val();

        proj = b64DecodeUnicode(proj);

        if (!upload[proj]) {
            console.log("initializing project: [" + proj + "]");
            upload[proj] = {};
        }

        if (type == 'lb-') {
            upload[proj][localBrKey] = val;
        } else if (type == 'rb-') {
            upload[proj][remoteBrKey] = val;
        } else if (type == 'mg-') {
            upload[proj][msgKey] = val;
        } else if (type == 'cg-') {
            upload[proj][chgId] = val;
        }
        else {
            console.warn('unsupported type: ' + type);
        }

        localStorage.setItem(localKey, JSON.stringify(upload));
        console.log(localStorage.getItem(localKey));

    } catch (err) {
        console.error(err);
    } finally {
        var cmd = encodeURI(cmdPrefix + JSON.stringify([b64EncodeUnicode(JSON.stringify(upload))]));
        $("#uplaodBtnView").attr("href", cmd);
        console.log(cmd);
    }
}

function restore() {
    var cmd = "";
    var uploadObj = localStorage.getItem(localKey);
    if (uploadObj) {
        try {
            console.log("Current model >>>" + JSON.stringify(upload));
            console.log("restoring... " + uploadObj);
            uploadObj = JSON.parse(uploadObj);
            var key = "";
            for (var proj in uploadObj) {
                var pk = b64EncodeUnicode(proj).replace(/(:|\.|\[|\]|,|=)/g, "\\$1");
                console.log(pk);
                if (uploadObj[proj].hasOwnProperty(localBrKey)) {
                    if (uploadObj[proj][localBrKey]) {
                        console.log("restore local br [" + uploadObj[proj][localBrKey] + "] for project[" + proj + "] from storage");
                        key = ("#lb-" + pk);
                        $(key).val(uploadObj[proj][localBrKey]);
                        $(key).trigger('input');
                    }
                }
                if (uploadObj[proj].hasOwnProperty(remoteBrKey)) {
                    if (uploadObj[proj][remoteBrKey]) {
                        console.log("restore remote br [" + uploadObj[proj][remoteBrKey] + "] for project[" + proj + "] from storage");
                        key = "#rb-" + pk;
                        $(key).val(uploadObj[proj][remoteBrKey]);
                        $(key).trigger('input');
                    }
                }
                // if (upload[proj][amendKey]) { // always use last commit when amending
                //     uploadObj[proj] = upload[proj];
                // }
                if (uploadObj[proj].hasOwnProperty(msgKey)) {
                    if (uploadObj[proj][msgKey]) {
                        console.log("restore message br [" + uploadObj[proj][msgKey] + "] for project[" + proj + "] from storage");
                        key = "#mg-" + pk;
                        $(key).val(uploadObj[proj][msgKey]);
                        $(key).trigger('input');
                    }
                }
                if (uploadObj[proj].hasOwnProperty(chgId)) {
                    if (uploadObj[proj][chgId]) {
                        console.log("restore change Id [" + uploadObj[proj][chgId] + "] for project[" + proj + "] from storage");
                        key = "#cg-" + pk;
                        $(key).val(uploadObj[proj][chgId]);
                        $(key).trigger('input');
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            cmd = encodeURI(cmdPrefix + JSON.stringify([b64EncodeUnicode(JSON.stringify(uploadObj))]));
            console.log("Use editted");
        }
    } else {
        cmd = encodeURI(cmdPrefix + JSON.stringify([b64EncodeUnicode(JSON.stringify(upload))]));
        console.log("Use default");
    }
    $("#uplaodBtnView").attr("href", cmd);
    console.log("Restored...... " + cmd);
};

$("#uplaodBtnView").click(() => {
    localStorage.removeItem(localKey);
    console.log("cache removed");
})

$(function () {
    restore();
    $('[data-toggle="tooltip"]').tooltip();

});
