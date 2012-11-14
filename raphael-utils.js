/*
 * Raphael SVG Import 0.0.1 - Extension to Raphael JS
 *
 * Copyright (c) 2009 Wout Fierens
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 *
 * 2011-12-08 modifications by Jonas Olmstead
 * - added support for radial and linear gradients
 * - added support for paths
 * - removed prototype.js dependencies (I can't read that stuff)
 * - changed input parameter to svg xml file
 * - added support for text elements
 * - added support for nested groups
 * - added support for transforms and scaling applied to groups
 * - svg elements returned as a set
 *
 */
Raphael.fn.importSVG = function (svgXML, options) {
    try {
        // create a set to return
        var m_myNewSet = this.set();

		if (!options)
			options = {};

        var strSupportedShapes = '|rect|circle|ellipse|path|image|text|polygon|';
		var specialSupportedShapes = '|g|tspan|'

        // collect all gradient colors
        var linGrads = svgXML.getElementsByTagName("linearGradient");
        var radGrads = svgXML.getElementsByTagName("radialGradient");

		var elShape;
        var m_font;
        var elSVG = svgXML;
        //elSVG.normalize();

        this.doFill = function (strNode, attr, mNodeName, mNodeValue) {
			//override fill value with default if it present
			mNodeValue = attr[mNodeName]?attr[mNodeName]:mNodeValue;
            // check if linear gradient
            if (mNodeValue.indexOf("url") == 0) {
                var opacity;
                var gradID = mNodeValue.substring("url(#".length, mNodeValue.length - 1);
                for (var l = 0; l < radGrads.length; l++)
                if (radGrads.item(l).getAttribute("id") == gradID) {
                    // get stops
                    var stop1, stop2;
                    for (var st = 0; st < radGrads.item(l).childNodes.length; st++)
                    if (radGrads.item(l).childNodes.item(st).nodeName == "stop") {
                        if (stop1)
							stop2 = radGrads.item(l).childNodes.item(st);
                        else
							stop1 = radGrads.item(l).childNodes.item(st);
                    }

                    if (!stop1)
						return; // could not parse stops

                    // TODO: implement radial offset
                    // radial gradients not supported for paths, so do linear
                    if (strNode == "path") attr[mNodeName] = 90 + "-" + stop1.getAttribute("stop-color") + "-" + stop2.getAttribute("stop-color") + ":50-" + stop1.getAttribute("stop-color");
                    else attr[mNodeName] = "r(" + radGrads.item(l).getAttribute("fx") + "," + radGrads.item(l).getAttribute("fx") + ")" + stop1.getAttribute("stop-color") + "-" + stop2.getAttribute("stop-color");

                    if (stop1.getAttribute("stop-opacity")) opacity = stop1.getAttribute("stop-opacity")
                }

                for (var l = 0; l < linGrads.length; l++)
					if (linGrads.item(l).getAttribute("id") == gradID) {
						// get angle
						var x1 = parseFloat(linGrads.item(l).getAttribute("x1"));
						var x2 = parseFloat(linGrads.item(l).getAttribute("x2"));
						var y1 = parseFloat(linGrads.item(l).getAttribute("y1"));
						var y2 = parseFloat(linGrads.item(l).getAttribute("y2"));
						var b = y2 - y1;
						var c = x2 - x1;

						angle = Math.atan2(b,c)*(180/Math.PI);
						if(angle < 0)
							angle = Math.abs(angle);
						else
							angle = 360 - angle;

						// get stops
						var stop1, stop2;
						for (var st = 0; st < linGrads.item(l).childNodes.length; st++)
							if (linGrads.item(l).childNodes.item(st).nodeName == "stop") {
								if (stop1) stop2 = linGrads.item(l).childNodes.item(st);
								else stop1 = linGrads.item(l).childNodes.item(st);
							}

						if (!stop1) return; // could not parse stops

						// TODO: hardcoded offset value of 50
						var stop1Color = stop1.getAttribute("stop-color");
						if (stop1Color == null)
							stop1Color = stop1.style['stop-color'];

						var stop2Color = stop2.getAttribute("stop-color");
						if (stop2Color == null)
							stop2Color = stop2.style['stop-color'];

						var offseta = 0;//Math.sqrt( (-y1*-y1) + (-x1*-x1) );
						var offsetb = 100;//Math.sqrt( (-y2*-y2) + (-x2*-x2) );

						attr[mNodeName] = angle + "-" + stop1Color + ":" + offseta + "-" + stop2Color + ":" + offsetb;
						if (stop1.getAttribute("stop-opacity"))
							opacity = stop1.getAttribute("stop-opacity");
					}
                if (opacity)
					attr["opacity"] = opacity;
            } else {
                attr[mNodeName] = mNodeValue;
            }
        };

        this.parseElement = function (elShape, myNewSet, moreAttr) {
            var node = elShape.nodeName.toLowerCase();
			var shape;

            if (node && (strSupportedShapes+specialSupportedShapes).indexOf("|" + node + "|") >= 0) {
				var attr = $.extend(null, {
						/* default attributes for all the shapes*/
					}, options[node], moreAttr);

                var style;
                m_font = "";

                for (var k = 0; k < elShape.attributes.length; k++) {
                    var m = elShape.attributes[k];

                    switch (m.nodeName) {
						case "stroke-dasharray":
							attr[m.nodeName] = "- ";
							break;
						case "style":
							// TODO: handle gradient fills within a style
							style = m.nodeValue.split(";");
							for (var l = 0; l < style.length; l++)
								if (style[l].split(":")[0] == "fill")
									this.doFill(node, attr, style[l].split(":")[0], style[l].split(":")[1]);
								else
									attr[style[l].split(":")[0]] = style[l].split(":")[1];
							break;
						case "fill":
							this.doFill(node, attr, m.nodeName, m.nodeValue);
							break;
						case "font-size":
							m_font = m.nodeValue + "px " + m_font;
							attr[m.nodeName] = m.nodeValue;
							break;
						case "font-family":
							var nodeValue = m.nodeValue.match(/'(.*?)'/);

							if (nodeValue != null && nodeValue.length > 1)
								nodeValue = nodeValue[1];
							else
								nodeValue = m.nodeValue;

							m_font = m_font + nodeValue;
							break;
						case "x":
						case "y":
						case "cx":
						case "cy":
						case "rx":
						case "ry":
							// use numbers for location coords
							attr[m.nodeName] = parseFloat(m.nodeValue);
							break;
						case "text-anchor":
							// skip these due to bug in text scaling
							break;
						default:
							attr[m.nodeName] = m.nodeValue;
							break;
                    }
                }

                switch (node) {
					case 'tspan':
					case "text":
						if (elShape.firstChild.nodeType == 3){ //text
							shape = this.text(attr["x"], attr["y"], elShape.text || elShape.textContent || elShape.innerText);
							shape.attr("font", m_font);
							shape.attr("stroke", "none");
							shape.origFontPt = parseInt(attr["font-size"]);
							break;
						}
					case 'g':
						// this is a group, parse the children and add to set
						var groupSet = this.set();

						if (!attr['parentId'])
							attr['parentId'] = '';
						if (!attr['id'])
							attr['id'] = '';//'set' + Math.floor(Math.random()*11);

						var newChildParent = attr['parentId'] + attr['id'];

						for (var o = 0; o < elShape.childNodes.length; o++){
							rpChild = this.parseElement(elShape.childNodes.item(o), groupSet, {parentId: newChildParent + '_' + groupSet.length});
							if (rpChild)
								this.setShapeId(rpChild, {id: newChildParent + '_' + groupSet.length});
						}

						shape = groupSet;

						break;
					case "rect":
						if (attr["rx"])
							shape = this.rect(attr["x"], attr["y"], elShape.getAttribute("width"), elShape.getAttribute("height"), attr["rx"]);
						else
							shape = this.rect();

						break;
					case "circle":
						// changed to ellipse, we are not doing circles today
						shape = this.ellipse();
						attr["rx"] = attr["r"];
						attr["ry"] = attr["r"];

						break;
					case "ellipse":
						shape = this.ellipse();

						break;
					case "path":
						shape = this.path(attr["d"]);

						break;
					case "polygon":
						// convert polygon to a path
						var point_string = attr["points"].trim();
						var aryPoints = point_string.split(" ");
						var strNewPoints = "M";
						for (var i in aryPoints) {
							if (i > 0)
								strNewPoints += "L";
							strNewPoints += aryPoints[i];
						}
						strNewPoints += "Z";
						shape = this.path(strNewPoints);

						break;
					case "image":
						shape = this.image();

						break;
                }

				// set shape id
				this.setShapeId(shape, attr);

                // put shape into set
                myNewSet.push(shape);

				for(var evNames in attr.events){
					paper.bindEvents(shape, evNames, attr.events[evNames]);
				}

                // apply attributes (if node is a set it will override child values)
				if (node != 'g')
					shape.attr(attr);

                // apply transforms
				if (attr['transform'] != null && shape.transform){
					var transformAttr = attr['transform'];
					if(transformAttr.indexOf('matrix')==0){
						var matrix = transformAttr.match(/matrix\((.*?)\)/)[1];
						shape.transform('m' + matrix);
					}
					else{
						eval('shape.' + transformAttr);
					}
                }
            }

			return shape;
        };

		this.setShapeId = function(shape, attr){
			var tagId = attr['id'];

			if (typeof tagId != 'undefined') {
				if (this.getById(tagId) != null) throw new Error('ID <' + tagId + '> already defined in SVG data. The ID value must be unique.');
				shape.id = tagId;
				// sets don't have node
				if (shape.type != 'set')
					shape.node.id = shape.id;
			}
		}

		for (var i = 0; i < elSVG.childNodes.length; i++) {
            elShape = elSVG.childNodes.item(i);

            this.parseElement(elShape, m_myNewSet);
        }
    } catch (error) {
        alert("The SVG data you entered was invalid! (" + error + ")");
    }

    // return our new set
    return m_myNewSet;
};

Raphael.fn.chrome = function(){
	//if google chrome
	$('text > tspan').attr('dy',0);
};

Raphael.fn.bindEvents = function(shape, eventNames, eventFn){
	$.each(eventNames.split(','), function(i, evName){
		shape[evName.trim()].apply(shape,[eventFn]);
	});
};

Raphael.el.moveTo = function(x, y){
	switch (this.type) {
			case "path":
					var path = Raphael.pathToRelative(this.attrs.path),
							dim = Raphael.pathBBox(path),
							dx = (path[0][1] - dim.x) + x,
							dy = (path[0][2] - dim.y) + y;
					path[0][1] = dx;
					path[0][2] = dy;
					return this.attr({path: path});
					break;
			default:
					return this.attr({cx: x+parseFloat(this.attr('rx')), cy: y+parseFloat(this.attr('ry'))});
			break;
	}
	return this;
};

/*
 * ScaleRaphael 0.8 by Zevan Rosser 2010
 * For use with Raphael library : www.raphaeljs.com
 * Licensed under the MIT license.
 *
 * www.shapevent.com/scaleraphael/
 */ (function () {
    window.ScaleRaphael = function (container, width, height) {
        var wrapper = document.getElementById(container);
        if (!wrapper.style.position) wrapper.style.position = "relative";
        wrapper.style.width = width + "px";
        wrapper.style.height = height + "px";
        wrapper.style.overflow = "hidden";

        var nestedWrapper;

        if (Raphael.type == "VML") {
            wrapper.innerHTML = "<rvml:group style='position : absolute; width: 1000px; height: 1000px; top: 0px; left: 0px' coordsize='1000,1000' class='rvml' id='vmlgroup'><\/rvml:group>";
            nestedWrapper = document.getElementById("vmlgroup");
        } else {
            wrapper.innerHTML = "<div id='svggroup'><\/div>";
            nestedWrapper = document.getElementById("svggroup");
        }

        var paper = new Raphael(nestedWrapper, width, height);
        var vmlDiv;

        if (Raphael.type == "SVG") {
            paper.canvas.setAttribute("viewBox", "0 0 " + width + " " + height);
        } else {
            vmlDiv = wrapper.getElementsByTagName("div")[0];
        }

        paper.changeSize = function (w, h, center, clipping) {
            clipping = !clipping;

            var ratioW = w / width;
            var ratioH = h / height;
            var scale = ratioW < ratioH ? ratioW : ratioH;

            var newHeight = parseInt(height * scale);
            var newWidth = parseInt(width * scale);

            if (Raphael.type == "VML") {
                // scale the textpaths
                var txt = document.getElementsByTagName("textpath");
                for (var i in txt) {
                    var curr = txt[i];
                    if (curr.style) {
                        if (!curr._fontSize) {
                            var mod = curr.style.fontSize.split("px"); //curr.style.font.split("px");
                            curr._fontSize = parseInt(mod[0]);
                            curr._font = curr.style.fontFamily; //mod[1];
                        }
                        curr.style.font = curr._fontSize * scale + "px" + curr._font;
                    }
                }
                var newSize;
                if (newWidth < newHeight) {
                    newSize = newWidth * 1000 / width;
                } else {
                    newSize = newHeight * 1000 / height;
                }
                newSize = parseInt(newSize);
                nestedWrapper.style.width = newSize + "px";
                nestedWrapper.style.height = newSize + "px";
                if (clipping) {
                    nestedWrapper.style.left = parseInt((w - newWidth) / 2) + "px";
                    nestedWrapper.style.top = parseInt((h - newHeight) / 2) + "px";
                }
                vmlDiv.style.overflow = "visible";
            }

            if (clipping) {
                newWidth = w;
                newHeight = h;
            }

            wrapper.style.width = newWidth + "px";
            wrapper.style.height = newHeight + "px";
            paper.setSize(newWidth, newHeight);

            if (center) {
                wrapper.style.position = "absolute";
                wrapper.style.left = parseInt((w - newWidth) / 2) + "px";
                wrapper.style.top = parseInt((h - newHeight) / 2) + "px";
            }
        }

        paper.scaleAll = function (amount) {
            paper.changeSize(width * amount, height * amount);
        }

        paper.changeSize(width, height);

        paper.w = width;
        paper.h = height;

        return paper;
    }
})();

if(typeof String.prototype.trim !== 'function') {
	String.prototype.trim = function() {
		return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
}
