$(function() {
    jQuery.ajax({
        type: "GET",
        url: "map.svg",
        dataType: "xml",
        error: function (xhr, ajaxOptions, thrownError) {
            alert('Ajax error getting svg file.');
        },
        success: function(data) {
            var xml = data;

            var svgTag = xml.getElementsByTagName('svg')[0];
            var root = xml.getElementsByTagName('svg')[0].getAttribute('viewBox').split(' ');
            var width = root[2], height = root[3];

            paper = ScaleRaphael('board', width, height);
            $('#board').css('width', '100%');
            paper.changeSize($('#board').width(), $('#board').width(), false, true);

            var svg = xml.getElementsByTagName('svg')[0];
            paper.importSVG(svg, {
                polygon: {
                    'stroke-width': 1,
                    'stroke': '#fff'
                },
                path: {
                    'stroke-width': 1
                },
                circle: {
                    'stroke-width': 1
                },
                text:{
                    'text-anchor': 'start'
                }
            });

            function resizePaper(){
                var win = $(this);
                paper.changeSize($('#board').width(), $('#board').width(), false, true);
            }
            $(window).resize(resizePaper);

            paper.chrome();
            paper.safari();
            paper.renderfix();

            
        }
    });
});