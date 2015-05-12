import "layout";
import "pack";

// Implement linear pack using algorithm in http://ieeexplore.ieee.org/xpl/articleDetails.jsp?arnumber=6876013

d3.layout.linearPack = function () {
    var linearPack = {},
        event = d3.dispatch("start"),
        nodes = [],
        padding = 0,
        size = [1, 1],
        scale = 1;

    linearPack.start = function () {
        var n = nodes.length,
            start = 0,
            bounds = [0, 0],
            a, b, c, i, j, k, l;

        function bound(node) {
            bounds[0] = Math.min(bounds[0], node.x - node.r);
            bounds[1] = Math.max(bounds[1], node.x + node.r);
        }

        nodes = nodes.sort(d3_layout_linearPackCompare); // sort
        scale = size[1] / nodes.slice(-1)[0].t;
        for (i = 0; i < n; i++) {
            nodes[i].t = nodes[i].t * scale;
            nodes[i].r = nodes[i].r * padding;
        }

        return function(i) {
            if (i >= n) {
                return - 2;
            } else if (nodes[i].r <= 0) {
                return i;
            }
            var t = [nodes[i].t - nodes[i].r, nodes[i].t + nodes[i].r];
            if (bounds[0] == bounds[1] || d3_layout_linearPackContain(bounds, t)) {
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
                            d3_layout_packPlace(a, b, c);
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

                    var place = function (j) {
                        if (d3_layout_linearPackContain(t, [j.x - j.r, j.x + j.r])) {
                            for (k = j._pack_next; k != j && d3_layout_linearPackTanDist(j, k) <= nodes[i].r * 2; k = k._pack_next) { // search for the 2nd append node
                                d3_layout_packPlace(j, k, nodes[i]);
                                var insect = 0;
                                for (l = 0; l < i; l++) { // check intersection
                                    if (d3_layout_packIntersects(nodes[l], nodes[i])) {
                                        insect = 1;
                                        break;
                                    }
                                }
                                if (insect == 0) {
                                    var location = JSON.parse(JSON.stringify(d3_layout_packPlace(j, k, nodes[i])));
                                    locations.push(location);
                                    map.push(j);
                                    map2.push(k);
                                }
                            }
                        }
                    };

                    for (j = a._pack_next; j !== a; j = j._pack_next) { // search for the 1st append node
                        place(j);
                    }
                    place(j);

                    if (locations.length == 0) {
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

                    d3_layout_packSplice(a, b);
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

    linearPack.size = function (x) {
        if (!arguments.length) return size;
        size = x;
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

    d3.rebind(linearPack, event, "on");
    return linearPack;
};

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