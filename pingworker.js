importScripts('libs/stormancer.js');

var accountId;
var applicationName;
var sceneName;

var config;
var client;
var pendingRpcPings = 0;
var maxPendingRpcPings = 1;
var maxSeconds = 120;

self.addEventListener('message', function(e) {
  switch (e.data.cmd) {
    case 'start':
    	accountId = e.data.accountId;
    	applicationName = e.data.applicationName;
    	sceneName = e.data.sceneName;
    	start();
    	break;
    case 'stop':
    	client.disconnect();
    	break;
    case 'maxPendingRpcPings':
    	maxPendingRpcPings = e.data.maxPendingRpcPings;
    	break;
  };
}, false);

function start()
{
	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);

	client.getPublicScene(sceneName, {}).then(function(scene) {
		return scene.connect().then(function() {
			var started = false;
			var dates = [];
			setInterval(function () {
				var requestTime = client.clock();
				if (requestTime)
				{
					if (pendingRpcPings < maxPendingRpcPings)
					{
						var p0 = performance.now();
						pendingRpcPings++;
						var requestTimeS = requestTime / 1000;
						var minTime = requestTimeS - maxSeconds;
						var shift = (dates[0] < minTime ? true : false);
						if (shift)
						{
							dates.shift();
						}
						if (!started)
						{
							for (var i = 0; i < maxSeconds; i++)
							{
								var data = {
									x: (minTime + i),
									y0: 0,
									y1: 0,
									y2: 0,
									y3: 0,
									redraw: false,
									shift: false
								};
								dates.push(minTime + i);
								self.postMessage(data);
							}
						}
						scene.getComponent("rpcService").rpc("rpcping", null, function(packet) {
							pendingRpcPings--;
							var responseTime = client.clock();
							var delta = (responseTime - requestTime);
							var data = packet.readObject();
							delta2 = (data - requestTime);
							var p1 = performance.now();
							delta3 = (p1 - p0);
							started = true;
							var data = {
								x: requestTimeS,
								y0: 0,
								y1: delta,
								y2: delta2,
								y3: delta3,
								redraw: true,
								shift: shift
							};
							dates.push(requestTimeS);
							self.postMessage(data);
						});
					}
				}
			}, 100);
		});
	});
}
