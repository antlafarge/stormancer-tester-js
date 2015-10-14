importScripts('libs/stormancer.js');

var accountId;
var applicationName;
var sceneName;

var config;
var client;
var scene;
var pendingRpcPings = 0;
var maxPendingRpcPings = 1;
var chartMaxTimeMs = 10 * 60 * 1000; // ms
var dates = [];
var pingsDelay = 1000;

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
    case 'pingsDelay':
    	pingsDelay = e.data.pingsDelay;
    	break;
  };
}, false);

var now = function()
{
	return (typeof(performance) != "undefined" && performance.now() || Date.now());
}

function start()
{
	self.postMessage({
		cmd: "message",
		message: "starting..."
	});

	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);

	client.getPublicScene(sceneName, {}).then(function(sc) {
		self.postMessage({
			cmd: "message",
			message: "connecting..."
		});
		scene = sc;
		return scene.connect().then(function() {
			self.postMessage({
				cmd: "message",
				message: "connected"
			});
			/*var chartMaxTimeS = chartMaxTimeMs / 1000;
			for (var i = 0; i < chartMaxTimeS; i++)
			{
				var data = {
					time: (minTime + i),
					ping: 0,
					requestTime: 0,
					responseTime: 0,
					redraw: false,
					shift: false
				};
				dates.push(minTime + i);
				self.postMessage(data);
			}*/

			sendPing();
		});
	});
}

function sendPing()
{
	var requestClock = client.clock();
	if (!requestClock || pendingRpcPings >= maxPendingRpcPings)
	{
		setTimeout(sendPing, 100);
		return;
	}

	var t0 = now();
	pendingRpcPings++;

	scene.getComponent("rpcService").rpc("rpcping", null, function(packet) {
		pendingRpcPings--;

		var t2 = now();
		var ping = t2 - t0;
		
		var responseClock = client.clock();
		var serverClock = packet.readObject();
		var requestTime = serverClock - requestClock;
		var responseTime = responseClock - serverClock;
		var ping2 = responseClock - requestClock;

		dates.push(t0);
		var minTime = t0 - chartMaxTimeMs;
		var shift = (dates[0] < minTime ? true : false);
		if (shift)
		{
			dates.shift();
		}

		var data = {
			cmd: "data",
			time: (t0 / 1000),
			ping: ping,
			ping2: ping2,
			requestTime: requestTime,
			responseTime: responseTime,
			redraw: true,
			shift: shift
		};
		self.postMessage(data);

		setTimeout(sendPing, pingsDelay);
	});
}
