var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "tester";
var sceneName = "main";

window.onload = main;

var config;
var client;
var scene;

var tests = [];

var stormancer = "stormancer";

var worker = new Worker("pingworker.js");

function main()
{
	tests.push(test_connect);
	tests.push(test_echo);
	tests.push(test_rpc);
	tests.push(test_rpc_cancel);
	tests.push(test_syncclock);
	tests.push(test_disconnect);
	execNextTest();
}

function execNextTest()
{
	if (tests.length)
	{
		var test = tests.shift();
		setTimeout(test, 1);
	}
}

function validTest(name)
{
	document.querySelector("#checkbox_"+name).checked = true;
}

function test_connect()
{
	console.log("test_connect: connect scene");

	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, {}).then(function(sc) {
		scene = sc;

		// preparation for test_echo
		scene.registerRoute("echo", test_echo_received);

		// preparation for test_rpc
		scene.getComponent("rpcService").addProcedure("rpc", function(ctx) {
			console.log("test_rpc: rpc request received");

			ctx.cancellationToken().onCancelled(function(reason) {
				console.log("test_rpc: rpc request cancelled");
				validTest("rpcclientcancel");
				execNextTest();
			});

			// return a promise for potential asynchronous call
			return new Promise(function(resolve, reject) {
				setTimeout(resolve, 1000); // async call, promise will resolve after some time
			}).then(function() {
				// then we execute the code, if the rpc is not cancelled
				if(!ctx.cancellationToken().isCancelled()) {
					var data = ctx.data();
					var message = msgpack.unpack(data);
					if (message === stormancer)
					{
						console.log("test_rpc: sending rpc response");
						ctx.sendValue(data, Stormancer.PacketPriority.MEDIUM_PRIORITY);
						validTest("rpcclient");
						execNextTest();
					}
				}
			});

		}, true);

		// preparation for test_rpc_cancel
		scene.registerRoute("rpcservercancel", function(d){
			console.log("test_rpc_cancel: RPC server cancelled validated");
			validTest("rpcservercancel");
		});

		// connect to scene
		return scene.connect().then(function() {
			validTest("connect");
			execNextTest();
		});
	});
}

function test_echo()
{
	console.log("test_echo: send data");

	scene.send("echo", stormancer);
}

function test_echo_received(data)
{
	console.log("test_echo: data received");

	if (data === stormancer)
	{
		validTest("echo");
		execNextTest();
	}
	else
	{
		console.error("test 'echo' failed");
	}
}

function test_rpc()
{
	console.log("test_rpc: sending rpc request");

	scene.getComponent("rpcService").rpc("rpc", stormancer, function(packet) {
		console.log("test_rpc: rpc response received");
		var data = packet.readObject();
		if (data === stormancer)
		{
			validTest("rpcserver");
			//execNextTest(); // don't do this, the server send back a rpc for the next test!
		}
	});
}

function test_rpc_cancel()
{
	console.log("test_rpc_cancel: sending rpc request");

	var rpcSub = scene.getComponent("rpcService").rpc("rpc", stormancer, function(packet) {
		console.warn("test_rpc_cancel: rpc request not canceled (rpc response received)");
		execNextTest();
	});
	rpcSub.unsubscribe();

	ssub = rpcSub;
}

function test_syncclock()
{
	console.log("test_syncclock");

	var clock = client.clock();
	if (clock)
	{
		validTest("syncclock");
		execNextTest();
	}
	else
	{
		setTimeout(test_syncclock, 500);
	}
}

function test_disconnect()
{
	console.log("test_disconnect: disconnect scene");

	scene.disconnect().then(function(p) {
		validTest("disconnect");
		execNextTest();
	}).catch(function(e) {
		console.error("test 'disconnect' failed", e);
	});
}

function createChart(title, numberOfSeries, onChartLoad)
{
	var div = $('<div id="container" style="min-width:640px; height:300px; margin:0 auto"></div>');
	$("body").append(div);
	div.highcharts({
		chart: {
			type: 'line',
			animation: false,
			marginRight: 10,
			events: {
				load: onChartLoad
			}
		},
		title: {
			text: title
		},
		xAxis: {
			tickPixelInterval: 150
		},
		yAxis: {
			title: {
				text: ''
			},
			min: 0
		},
		tooltip: {
			formatter: function () {
				return '<b>' + this.series.name + '</b><br/><b>x:</b> ' + this.x + '<br/><b>y:</b> ' + this.y;
			}
		},
		legend: {
			enabled: false
		},
		series: (function() {
			var series = [];
			for (var i = 0; i < numberOfSeries; i++)
			{
				series.push({
					data: [],
					lineWidth : 2,
					marker : {
						enabled : false,
						radius : 1,
						symbol: "circle"
					}
				});
			}
			return series;
		})()
	});
}

function maxPendingRpcPings(value)
{
	worker.postMessage({
		cmd: "maxPendingRpcPings",
		maxPendingRpcPings: value
	});
}

function pingsDelay(value)
{
	worker.postMessage({
		cmd: "pingsDelay",
		pingsDelay: value
	});
}

function run_pings()
{
	document.querySelector("#buttonStartPing").disabled = true;

	createChart("ping", 4, function () {
		var serie1 = this.series[0];
		var serie2 = this.series[1];
		var serie3 = this.series[2];
		var serie4 = this.series[3];
		worker.addEventListener('message', function(e) {
			if (e.data.cmd == "data")
			{
				serie4.addPoint([e.data.time, e.data.responseTime], false, e.data.shift);
				serie3.addPoint([e.data.time, e.data.requestTime], false, e.data.shift);
				//serie2.addPoint([e.data.time, e.data.ping2], false, e.data.shift);
				serie1.addPoint([e.data.time, e.data.ping], true, e.data.shift);
			}
			else if (e.data.cmd == "message")
			{
				console.log("worker: " + e.data.message);
			}
			else
			{
				console.log(e.data.cmd, e.data);
			}
		});
	});

	updatePingsDelay();
	
	worker.postMessage({
		cmd: "start",
		accountId: accountId,
		applicationName: applicationName,
		sceneName: sceneName
	});
}

function updatePingsDelay()
{
	var delay = document.querySelector("#inputPingsDelay").value;
	pingsDelay(delay);
}
