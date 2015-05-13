import "layout";
import "pack";

// Implement linear pack using algorithm in http://ieeexplore.ieee.org/xpl/articleDetails.jsp?arnumber=6876013

d3.layout.linearPack = function () {
    var linearPack = {},
        event = d3.dispatch("start"),
        nodes = [],
        padding = 0,
        width = 1000,
        scale = 1,
        radiusScale,
        range;

    linearPack.start = function () {
        var n = nodes.length,
            start = 0,
            bounds = [0, 0],
            a, b, c, i, j, k, l;

        function bound(node) {
            bounds[0] = Math.min(bounds[0], node.x - node.r);
            bounds[1] = Math.max(bounds[1], node.x + node.r);
        }

        var nodesByRadius = nodes.sort(function (a, b) {
            return a.r - b.r;
        });
        nodes.sort(d3_layout_linearPackCompare); // sort
        range = [nodes[0].t, nodes[n-1].t];
        scale = width / nodes[n-1].t;
        var radiusMedian = nodesByRadius[Math.floor(n/2)].r;
        if (!radiusScale) {
            radiusScale = scale / radiusMedian;
        }
        for (i = 0; i < n; i++) {
            nodes[i].t = nodes[i].t * scale;
            nodes[i].r = nodes[i].r * padding * radiusScale;
        }
        return function(i) {
            if (i >= n) {
                return - 2;
            } else if (nodes[i].r === 0) {
                return i;
            }
            var t = [nodes[i].t - nodes[i].r, nodes[i].t + nodes[i].r];
            if (bounds[0] === bounds[1] || d3_layout_linearPackContain(bounds, t)) {
                if (i - start < 3) { // the first three are trivial
                    d3_layout_packLink(nodes[i]);
                    switch(i - start) {
                        case 0: // create first node
                            a = nodes[i];
                            a.x = a.t;
                            a.y = 0;
                            bound(a);
                            break;
                        case 1: // create second node
                            b = nodes[i];
                            b.x = a.t + a.r + b.r;
                            b.y = 0;
                            bound(b);
                            break;
                        case 2: // create third node and build front-chain
                            c = nodes[i];
                            d3_layout_pack2Place(a, b, c);
                            bound(c);
                            d3_layout_packInsert(a, c);
                            a._pack_prev = c;
                            d3_layout_packInsert(c, b);
                            b = a._pack_next;
                            break;
                    }
                } else { // find the best placement for the rest
                    var locations = [],
                        map = [],
                        map2 = [];

                    var place = function (i, j) {
                        if (d3_layout_linearPackContain(t, [j.x - j.r, j.x + j.r])) {
                            for (k = j._pack_next; k != j; k = k._pack_next) { // search for the 2nd append node
                                if (d3_layout_linearPackTanDist(j, k) > nodes[i].r * 2) {
                                    continue;
                                }
                                d3_layout_pack2Place(j, k, nodes[i]);
                                var insect = 0;
                                for (l = 0; l < i; l++) { // check intersection
                                    if (d3_layout_packIntersects(nodes[l], nodes[i])) {
                                        insect = 1;
                                        break;
                                    }
                                }
                                if (insect === 0) {
                                    var location = JSON.parse(JSON.stringify(d3_layout_pack2Place(j, k, nodes[i])));
                                    locations.push(location);
                                    map.push(j);
                                    map2.push(k);
                                }
                            }
                        }
                    };

                    for (j = a._pack_next; j !== a; j = j._pack_next) { // search for the 1st append node
                        place(i, j);
                    }
                    place(i, j);

                    if (locations.length === 0) {
                        console.log("no valid location...");
                        return -2;
                    }
                    var location = locations[0],
                        index = 0;
                    locations.forEach(function (value, i) {
                        if (value.dist < location.dist) {
                            location = value;
                            index = i;
                        }
                    });
                    nodes[i].x = location.x;
                    nodes[i].y = location.y;
                    a = map[index];
                    b = map2[index];

                    d3_layout_packInsert(a, nodes[i]); b = nodes[i];
                    bound(nodes[i]);
                }
            } else { // start a new placement block
                start = i; bounds = [0, 0]; i--;
            }
            return i;
        }
    };

    linearPack.nodes = function (x) {
        if (!arguments.length) return nodes;
        nodes = x;
        return linearPack;
    };

    linearPack.width = function (x) {
        if (!arguments.length) return width;
        width = x;
        return linearPack;
    };

    linearPack.padding = function (x) {
        if (!arguments.length) return padding;
        padding = +x;
        return linearPack;
    };

    linearPack.scale = function (x) {
        if (!arguments.length) return scale;
        scale = x;
        return linearPack;
    };

    linearPack.radiusScale = function (x) {
        if (!arguments.length) return radiusScale;
        radiusScale = x;
        return linearPack;
    };

    linearPack.range = function () {
        return range;
    };

    d3.rebind(linearPack, event, "on");
    return linearPack;
};

function d3_layout_packInsert(a, b) {
    var c = a._pack_next;
    a._pack_next = b;
    b._pack_prev = a;
    b._pack_next = c;
    c._pack_prev = b;
}

function d3_layout_packIntersects(a, b) {
    var dx = b.x - a.x,
        dy = b.y - a.y,
        dr = a.r + b.r;
    return .999 * dr * dr > dx * dx + dy * dy; // relative error within epsilon
}

function d3_layout_packLink(node) {
    node._pack_next = node._pack_prev = node;
}

function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
}

function d3_layout_pack2Place(a, b, c) {
    var db = a.r + c.r,
        dx = b.x - a.x,
        dy = b.y - a.y;
    if (db && (dx || dy)) {
        var da = b.r + c.r,
            dc = dx * dx + dy * dy;
        da *= da;
        db *= db;
        var x = .5 + (db - da) / (2 * dc),
            y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
        c.x = a.x + x * dx + y * dy;
        c.y = a.y + x * dy - y * dx;
    } else {
        c.x = a.x + db;
        c.y = a.y;
    }
    c.dist = Math.sqrt(Math.pow(c.x - c.t, 2) + Math.pow(c.y - 0, 2));
    //c.neighbour = a;
    return c;
}

function d3_layout_linearPackContain(a, b) {
    return !(a[1] < b[0] || b[1] < a[0]);
}

function d3_layout_linearPackCompare(a,b) {
    if (a.t < b.t)
        return -1;
    if (a.t > b.t)
        return 1;
    else {
        if(a.r < b.r) {
            return 1;
        }
        if (a.r > b.r) {
            return -1;
        }
        return 0;
    }
}

function d3_layout_linearPackTanDist(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) - a.r - b.r;
}