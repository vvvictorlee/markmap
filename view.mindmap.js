(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['d3'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('d3'));
    } else {
        // Browser globals (root is window)
        root.markmap = factory(root.d3);
    }
}(this, function (d3) {

return function init(el, data, options) {

var height = options.height;
var width = options.width;

var i = 0,
    duration = 750,
    root;

var tree = d3.layout.tree()
    .size([height, width]);

var color = d3.scale.category20();

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svg = el.append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.behavior.zoom().on("zoom", function () {
      svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
    }))
    .append("g");

traverseHelperNodes(data);
data.children[0].children.forEach(function(d, i) {
  traverseBranchId(d, i);
});

root = data;
root.x0 = height / 2;
root.y0 = 0;

// function collapse(d) {
//   if (d.children) {
//     d._children = d.children;
//     d._children.forEach(collapse);
//     d.children = null;
//   }
// }
//root.children.forEach(collapse);

update(root);

function traverseMinDistance(node) {
  var val = Infinity;
  if (node.children) {
    val = Math.min.apply(null, node.children.map(traverseMinDistance));
    if (node.children.length > 1) {
      val = Math.min(val, Math.abs(node.children[0].x - node.children[1].x));
    }
  }
  return val;
}

function traverseHelperNodes(node) {
  var children = node.children;
  if (children && children.length > 0) {
    var tmp = {
      name: '',
      children: children
    };
    node.children = [tmp];
  } else {
    node.children = [{
      name: ''
    }];
  }
  if (children) {
    children.forEach(traverseHelperNodes);
  }
}

function getLabelWidth(d) {
  // constant ratio for now, needs to be measured based on font
  return d.name.length * 5;
}

function traverseLabelWidth(d, offset) {
  d.y += offset;
  if (d.name !== '' && d.children && d.children.length === 1 && d.children[0].name === '') {
    var child = d.children[0];
    offset += d.y + getLabelWidth(d) - child.y;
    child.y += offset;
    if (child.children) {
      child.children.forEach(function(c) {
        traverseLabelWidth(c, offset);
      });
    }
  }
}

function traverseBranchId(node, branch) {
  node.branch = branch;
  if (node.children) {
    node.children.forEach(function(d) {
      traverseBranchId(d, branch);
    });
  }
}

function update(source) {

  var offset = root.x !== undefined ? root.x : root.x0;

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

  // Normalize
  var ratio = 20 / traverseMinDistance(root);
  offset -= root.x * ratio;

  nodes.forEach(function(d) {
    d.y = d.depth * 180;
    d.x = d.x * ratio + offset;
  });

  //traverseLabelWidth(root, 0);

  // Update the nodes…
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", click);

  nodeEnter.append("circle")
      .attr('stroke', function(d) { return color(d.branch); })
      .attr("r", 1e-6)
      .style("fill", function(d) { return d._children ? color(d.branch) : "#fff"; });

  nodeEnter.append("text")
      .attr("x", function(d) { return  10; })
      .attr("dy", "-0.5em")
      .attr("text-anchor", function(d) { return "start"; })
      .text(function(d) { return d.name; })
      .style("fill-opacity", 1e-6);

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .attr("r", 4.5)
      .style("fill", function(d) {
         return d._children ? color(d.branch) : "#fff"
      })
      .style('display', function(d) {
        var isLabelNode = d.name !== '' && d.children && d.children.length === 1 && d.children[0].name === '';
        var hasChildren = d.children || d._children;
        return isLabelNode || !hasChildren ? 'none' : 'inline';
      });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
      .style("fill-opacity", 1e-6);

  // Update the links…
  var link = svg.selectAll("path.link")
      .data(links, function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
      .attr("class", "link")
      .attr('stroke', function(d) { return color(d.target.branch); })
      .attr('stroke-width', function(l) {
        var d = l.target;
        var depth = d.depth;
        if (d.name !== '' && d.children && d.children.length === 1 && d.children[0].name === '') {
          depth += 1;
        }
        return Math.max(8 - depth, 1.5);
      })
      .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      });

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {
  if (d.name !== '' && d.children && d.children.length === 1 && d.children[0].name === '') {
    d = d.children[0];
  }
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}

}
 
}));