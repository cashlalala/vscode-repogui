// var sysCfg = {
//     "workspace": {
//         linuxPath: "/home/cash/trunk_head"
//     },
//     "ssh": {
//         "host": "ubuntu1404",
//         "port": 22,
//         "user": "cash",
//         "pwd": "123456"
//     },
//     "repotool": {
//         "path": "repo"
//         "uploadType" : "draft" // one of ["draft","chage"]
//         "initOption" :　""
//         "syncOption" : ""
//     },
//     "git": {
//         "path": "git"
//     },
//     "manifest": {
//         "type": [
//             "hq",
//             "sub",
//             "one"
//         ]
//     }
// };
var restoreKey = "config_key";

function composeCmd() {
    return "command:repotool-cmd:config-submit?" + encodeURI(JSON.stringify(sysCfg));
}

function updateUrl() {

    localStorage.setItem(restoreKey, JSON.stringify(sysCfg));
    var url = composeCmd();
    console.log(url);
    $("#saveCfgBtn").attr("href", url);
}

$("input").on("input", function () {
    console.log($(this).val());
    var id = $(this).attr("id");
    var val = $(this).val();
    if (id == "workspace_linuxpath") {
        sysCfg.workspace.linuxPath = val;
    } else if (id == "ssh_host") {
        sysCfg.ssh.host = val;
    } else if (id == "ssh_port") {
        sysCfg.ssh.port = val;
    } else if (id == "ssh_user") {
        sysCfg.ssh.user = val;
    } else if (id == "ssh_pwd") {
        sysCfg.ssh.pwd = val;
    } else if (id == "repotool_path") {
        sysCfg.repotool.path = val;
    } else if (id == "repotool_initopt") {
        sysCfg.repotool.initOption = val;
    } else if (id == "repotool_syncopt") {
        sysCfg.repotool.syncOption = val;
    } else if (id == "git_path") {
        sysCfg.git.path = val;
    } else {
        console.error("unknown id: " + id);
    }

    updateUrl();
});

$("#repotool_uploadtype").on("changed.bs.select", (evnt) => {
    sysCfg.repotool.uploadType = $(evnt.target).find(":selected").val();
    console.log(JSON.stringify(sysCfg.repotool.uploadType));
    updateUrl();
});

$("#saveCfgBtn").click(function () {
    try {
        localStorage.setItem(restoreKey, null);
        localStorage.removeItem(restoreKey);
        console.log("remove local storage");
    } catch (error) {
        console.error(error);
    }
});

$(function () {
    if (localStorage.getItem(restoreKey)) {
        console.log("recover from local storage... " + JSON.stringify(restoreKey));
        sysCfg = JSON.parse(localStorage.getItem(restoreKey));
    }

    var url = composeCmd();
    console.log(url);
    $("#saveCfgBtn").attr("href", url);

    if (isWindows) {
        if (sysCfg.workspace) {
            $("#workspace_linuxpath").val(sysCfg.workspace.linuxPath);
        }

        if (sysCfg.ssh) {
            $("#ssh_host").val(sysCfg.ssh.host);
            $("#ssh_port").val(sysCfg.ssh.port);
            $("#ssh_user").val(sysCfg.ssh.user);
            $("#ssh_pwd").val(sysCfg.ssh.pwd);
        }
    } else {
        $("#ssh_panel").hide();
        $("#workspace_panel").hide();
    }

    console.log(JSON.stringify(sysCfg.repotool));
    if (sysCfg.repotool) {
        $("#repotool_path").val(sysCfg.repotool.path);

        if (sysCfg.repotool.hasOwnProperty('uploadType')) {
            $("#repotool_uploadtype").val(sysCfg.repotool.uploadType);
        } else {
            $("#repotool_uploadtype").val("DRAFT");
        }

        $("#repotool_initopt").val(sysCfg.repotool.initOption);
        $("#repotool_syncopt").val(sysCfg.repotool.syncOption);

        $("#repotool_uploadtype").trigger("change");
    }

    if (sysCfg.git) {
        $("#git_path").val(sysCfg.git.path);
    }

    if (sysCfg.manifest) {
        console.log(JSON.stringify(sysCfg.manifest.type));
        if (!sysCfg.manifest.type || sysCfg.manifest.type.length == 0) {
            sysCfg.manifest.type = ["HQ", "ONE", "SUB"];
        }
        sysCfg.manifest.type.forEach((v) => {
            $("#manifest_type option[value='" + v + "']").prop("selected", true);
        });
        $("#manifest_type").trigger("change");
    }

});