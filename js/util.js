'use strict'
if ( !window.requestAnimationFrame ) {
     window.requestAnimationFrame = ( function() {
         return window.webkitRequestAnimationFrame ||
             window.mozRequestAnimationFrame ||
             window.oRequestAnimationFrame ||
             window.msRequestAnimationFrame ||
             function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
                window.setTimeout( callback, 1000 / 60 );
            };

    } )();
}

function Util() {}

var util = module.exports = new (function() { // jshint ignore:line
    this.ajax = function(url, callback) {
	var oReq = new XMLHttpRequest();
	oReq.open("GET", url, true);
	oReq.onreadystatechange = function (oEvent) {
	    if (oReq.readyState === 4) {
		if (oReq.status === 200) {
		    callback && callback(oReq.responseText); // jshint ignore:line
		} else {
		    console.log("Error", oReq.statusText);
		}
	    }
	};
	oReq.send(null);
    };

    this.clone = function clone(o) {
	if(!o || 'object' !== typeof o)  {
	    return o;
	}
	var c = 'function' === typeof o.pop ? [] : {};
	var p, v;
	for(p in o) {
	    if(o.hasOwnProperty(p)) {
		v = o[p];
		if(v && 'object' === typeof v) {
		    c[p] = clone(v);
		}
		else {
		    c[p] = v;
		}
	    }
	}
	return c;
    };

    this.rand = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    this.ucfirst = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    this.lcfirst = function(string) {
        return string.charAt(0).toLowerCase() + string.slice(1);
    };

    //point to rect
    this.intersects = function(x, y, rx, ry, w, h) {
        return x > rx && x < rx + w && y > ry && y < ry + h;
    };

    this.rectIntersects = function(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x2 < x1+w1 && x2+w2 > x1 && y2 < y1+h1 && y2+h2 > y1;
    };

    this.extend = function(Child, Parent) {
        var F = function() { }
        F.prototype = Parent.prototype
        Child.prototype = new F()
	Child.prototype.constructor = Child
        Child.superclass = Parent.prototype
    };

    this.toFixed = function(value, digits) {
        digits = digits || 0;
        var c = Math.pow(10, digits);
        return (parseInt(value * c) / c).toFixed(digits);
    };

    this.monetary = function(value) {
        return String(value).replace(/(\.\d\d)\d+/, "$1");
    };

    this.distanceLessThan = function (len1, len2, r) {
        return (len1 * len1 + len2 * len2 < r * r);
    };

    this.validateInput = function(input, predicate, message) {
        if (predicate)
            return true;
        game.alert(message, function() {
            input.focus();
        });
        return false;
    };

    this.hash = function(string) {
        var hash = 0;
        if (string.length === 0) return hash;
        for (var i = 0, l = string.length; i < l; i++) {
            var char  = string.charCodeAt(i);
            hash  = ((hash<<5)-hash)+char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };

    var re_btou = new RegExp([
        '[\xC0-\xDF][\x80-\xBF]',
        '[\xE0-\xEF][\x80-\xBF]{2}',
        '[\xF0-\xF7][\x80-\xBF]{3}'
    ].join('|'), 'g');
    var cb_btou = function(cccc) {
        var fromCharCode = String.fromCharCode;
        switch(cccc.length) {
        case 4:
            var cp = ((0x07 & cccc.charCodeAt(0)) << 18) |
                     ((0x3f & cccc.charCodeAt(1)) << 12) |
                     ((0x3f & cccc.charCodeAt(2)) <<  6) |
                     (0x3f & cccc.charCodeAt(3)),
            offset = cp - 0x10000;
            return (fromCharCode((offset  >>> 10) + 0xD800) +
                    fromCharCode((offset & 0x3FF) + 0xDC00));
        case 3:
            return fromCharCode(
                ((0x0f & cccc.charCodeAt(0)) << 12) |
                     ((0x3f & cccc.charCodeAt(1)) << 6) |
                      (0x3f & cccc.charCodeAt(2))
            );
        default:
            return  fromCharCode(
                ((0x1f & cccc.charCodeAt(0)) << 6) |
                      (0x3f & cccc.charCodeAt(1))
            );
        }
    };
    var btou = function(b) {
        return b.replace(re_btou, cb_btou);
    };

    this.decompress = function(data) {
        return btou(RawDeflate.inflate(new Uint8Array(data)));
    };

    var merge = function(left, right, compare) {

        var result = [];

        while (left.length > 0 || right.length > 0) {
            if (left.length > 0 && right.length > 0) {
                if (compare(left[0], right[0]) <= 0) {
                    result.push(left[0]);
                    left = left.slice(1);
                }
                else {
                    result.push(right[0]);
                    right = right.slice(1);
                }
            }
            else if (left.length > 0) {
                result.push(left[0]);
                left = left.slice(1);
            }
            else if (right.length > 0) {
                result.push(right[0]);
                right = right.slice(1);
            }
        }
        return result;
    }
    var msort = function(arr, compare) {
        var length = arr.length,
        middle = Math.floor(length / 2);

        if (!compare) {
            compare = function(left, right) {
                if (left < right)
                    return -1;
                if (left == right)
                    return 0;
                else
                    return 1;
            };
        }

        if (length < 2)
            return arr;

        return merge(
            msort(arr.slice(0, middle), compare),
            msort(arr.slice(middle, length), compare),
            compare
        );
    }
    this.msort = msort;

    // http://ncase.me/sight-and-light/
    this.getIntersection = function(ray,segment) {
	// RAY in parametric: Point + Direction*T1
	var r_px = ray.a.x;
	var r_py = ray.a.y;
	var r_dx = ray.b.x-ray.a.x;
	var r_dy = ray.b.y-ray.a.y;

	// SEGMENT in parametric: Point + Direction*T2
	var s_px = segment.a.x;
	var s_py = segment.a.y;
	var s_dx = segment.b.x-segment.a.x;
	var s_dy = segment.b.y-segment.a.y;

	// Are they parallel? If so, no intersect
	var r_mag = Math.sqrt(r_dx*r_dx+r_dy*r_dy);
	var s_mag = Math.sqrt(s_dx*s_dx+s_dy*s_dy);
	if(r_dx/r_mag==s_dx/s_mag && r_dy/r_mag==s_dy/s_mag){ // Directions are the same.
	    return null;
	}

	// SOLVE FOR T1 & T2
	// r_px+r_dx*T1 = s_px+s_dx*T2 && r_py+r_dy*T1 = s_py+s_dy*T2
	// ==> T1 = (s_px+s_dx*T2-r_px)/r_dx = (s_py+s_dy*T2-r_py)/r_dy
	// ==> s_px*r_dy + s_dx*T2*r_dy - r_px*r_dy = s_py*r_dx + s_dy*T2*r_dx - r_py*r_dx
	// ==> T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx)
	var T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx);
	var T1 = (s_px+s_dx*T2-r_px)/r_dx;

	// Must be within parametic whatevers for RAY/SEGMENT
	if(T1<0) return null;
	if(T2<0 || T2>1) return null;

	// Return the POINT OF INTERSECTION
	return {
	    x: r_px+r_dx*T1,
	    y: r_py+r_dy*T1,
	    param: T1
	};

    };

    this.date = {
        human: function(date) {
            return date.toLocaleDateString("ru-RU");
        },
        iso: function(date) {
            return date.toISOString().slice(0, 10);
        },
        format: function(format, date) {
            throw "not imlemented"; //TODO: implement date.format
        },
    };


    this.dotimes = function(n, callback) {
        return Array.apply(null, Array(n)).map(callback);
    };

    this.formatTime = function(time) {
        var hours = Math.floor(time / 60);
        var minutes = time % 60;
        if (minutes < 10)
            minutes = '0' + minutes;
        return hours + ":" + minutes;;
    };
})()

