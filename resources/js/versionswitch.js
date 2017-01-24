function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function restoreState() {
};

$(document).ready(function () {

    $("#path_mapping_grp").hide();
    $("#new_code_chk").click((event) => {
        if ($('#new_code_chk').prop("checked")) {
            $("#path_mapping_grp").show();
        } else {
            $("#path_mapping_grp").hide();
        }
    });

    $(this).on('change', (evnt) => {
        var br = $("#branch").val(),
            np = $("#new_path").val();
        var parm = [br, np];

        localStorage['selected_info'] = parm;

        if (br) {
            var url = encodeURI("command:repotool-cmd:getcode?" + JSON.stringify(parm));
            console.log(url);
            $("#getCodeBtn").attr("href", url);
            $("#getCodeBtn").removeClass("disabled");
            $("#getCodeBtn").addClass("active");
        } else {
            $("#getCodeBtn").removeClass("active");
            $("#getCodeBtn").addClass("disabled");
        }
    });

    $(function () {
        restoreState();
        localStorage.removeItem('selected_info');
    });

});