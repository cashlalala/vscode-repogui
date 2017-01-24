
var uploadCmd = "command:repotool-cmd:upload?";

$(document).ready(function () {

    console.log("status ready");

    $(".upload-all-cls").each(function () {
        $(this).hide();
    });

    $('input[type=checkbox]').on('change', function () {
        try {
            var uploadBtn = $(this).parent().siblings(".btn-group").first().children(".upload-all-cls").first();
            if (this.checked) {
                uploadBtn.show();
            } else {
                uploadBtn.hide();
            }
            var projs = [];
            $(".sel-proj-chb:checkbox:checked").each(function (i, v) {

                var proj = $(v).parent().siblings(".proj-name").first().children("a").first();
                projs.push(proj.text());
                var projStr = JSON.stringify(projs);


                localStorage['projs'] = projs.join(",");

                $(".upload-all-cls").each(function () {
                    if (projs.length) {
                        $(this).attr("href", uploadCmd + projStr);
                    } else {
                        $(this).attr("href", "");
                    }
                });
            });

        } catch (error) {
            console.trace(error);
        }
    });

    var projs = localStorage["projs"];
    $(".sel-proj-chb:checkbox").each(function (i, v) {
        var proj = $(v).parent().siblings(".proj-name").first().children("a").first();
        if (projs && projs.indexOf(proj.text()) > -1) {
            console.log("found project: " + proj.text());
            $(v).prop('checked', true);
            $(v).trigger('change');
        }
    });

    $(function () {
        localStorage.removeItem('projs');
        $('[data-toggle="tooltip"]').tooltip();
    });
});

