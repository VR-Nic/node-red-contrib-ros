module.exports = function (RED){
  return function (config) {
    var ROSLIB = require('roslib');

    RED.nodes.createNode(this,config);
    var node = this;

    node.closing = false;
    node.on("close", function() {
      node.closing = true;
      if (node.tout) {
        clearTimeout(node.tout);
      }
      if (node.ros){
        node.ros.close();
      }
    });

    var trials = 0;
    const maxTrials = 100;

    function startconn() {    // Connect to remote endpoint
      var ros = new ROSLIB.Ros({
        url : config.url,
        encoding: config.encoding,
        transportLibrary: config.transportLibrary
      });
      node.ros = ros; // keep for closing
      handleConnection(ros);
    }

    function handleConnection(ros) {
      ros.on('connection', function() {
      	node.emit('ros connected');
        if (node.tout) { clearTimeout(node.tout); }
      });

      ros.on('error', function(error) {
        trials++;
      	node.emit('ros error');
        if (!node.closing) {
          if(trials < maxTrials){
            node.tout = setTimeout(function(){ startconn(); }, (2 * trials * 1000));
          }
          else {
            console.error("Could not connect to ROS endpoint: %s", ros.url);
          }
        }
      });

      ros.on('close', function() {
      	node.emit('ros closed');
        if (!node.closing) {
          node.tout = setTimeout(function(){ startconn(); }, 1000);
        }
      });
    }

    startconn();
    node.closing = false;
  }
}
