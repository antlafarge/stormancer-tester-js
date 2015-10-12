var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "tester";
var sceneName = "main";

window.onload = main;

var config;
var client;
var scene;

var tests = [];

function main()
{
	tests.push(test_connect);
	tests.push(test_echo);
	tests.push(test_rpc);
	tests.push(test_syncclock);
	tests.push(test_disconnect);
	execNextTest();
}

function execNextTest()
{
	if (tests.length)
	{
		var test = tests.shift();
		test();
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
		scene.registerRoute("echo", test_echo_receive);

		// preparation for test_rpc
		scene.getComponent("rpcService").addProcedure("rpc", function(ctx) {
			console.log("test_rpc: data received (rpc server)");
			var data = ctx.data();
			var message = msgpack.unpack(data);
			if (message == "stormancer")
			{
				ctx.sendValue(data, Stormancer.PacketPriority.MEDIUM_PRIORITY);
				validTest("rpcserver");
				execNextTest();
				return Promise.resolve();
			}
			else
			{
				return Promise.reject();
			}
		}, true);

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

	scene.send("echo", "stormancer")
}

function test_echo_receive(data)
{
	console.log("test_echo: data received");

	if (data === "stormancer")
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
	console.log("test_rpc: send data");

	scene.getComponent("rpcService").rpc("rpc", "stormancer", function(packet) {
		console.log("test_rpc: data received (rpc client)");
		data = packet.readObject();
		if (data === "stormancer")
		{
			validTest("rpcclient");
		}
	});
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
		setTimeout(test_syncclock, 1000);
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

function run_pings()
{
	document.querySelector("#buttonStartPing").disabled = true;

	Highcharts.setOptions({
		global: {
			useUTC: false
		}
	});

	$('#container').highcharts({
		chart: {
			type: 'line',
			animation: false,
			marginRight: 10,
			events: {
				load: function () {
					var serie0 = this.series[0];
					var serie1 = this.series[1];
					var serie2 = this.series[2];
					var serie3 = this.series[3];
					var worker = new Worker("pingworker.js");
					worker.postMessage({
						cmd: "start",
						accountId: accountId,
						applicationName: applicationName,
						sceneName: sceneName
					});
					worker.addEventListener('message', function(e) {
						serie0.addPoint([e.data.x, e.data.y0], false, e.data.shift);
						serie1.addPoint([e.data.x, e.data.y1], false, e.data.shift);
						serie2.addPoint([e.data.x, e.data.y2], false, e.data.shift);
						serie3.addPoint([e.data.x, e.data.y3], e.data.redraw, e.data.shift);
					}, false);
					maxPendingRpcPings = function(value)
					{
						worker.postMessage({
							cmd: "maxPendingRpcPings",
							maxPendingRpcPings: value
						});
					}
				}
			}
		},
		title: {
			text: 'Pings'
		},
		xAxis: {
			tickPixelInterval: 150
		},
		yAxis: {
			title: {
				text: 'ping'
			},
			min: 0
		},
		tooltip: {
			formatter: function () {
				return '<b>' + this.series.name + '</b><br/>' +
					this.x + '<br/>' +
					Highcharts.numberFormat(this.y, 2);
			}
		},
		legend: {
			enabled: false
		},
		exporting: {
			enabled: false
		},
		series: [
			{
				name: 'send rpc',
				data: [],
				lineWidth : 0,
				marker : {
                    enabled : true,
                    radius : 1,
                    symbol: "circle"
                }
			},
			{
				name: 'ping (syncclock)',
				data: [],
				lineWidth : 1,
				marker : {
                    enabled : false,
                    radius : 1,
                    symbol: "circle"
                }
			},
			{
				name: 'request time (syncclock)',
				data: [],
				lineWidth : 1,
				marker : {
                    enabled : false,
                    radius : 1,
                    symbol: "circle"
                }
			},
			{
				name: 'ping (js time)',
				data: [],
				lineWidth : 1,
				marker : {
                    enabled : false,
                    radius : 1,
                    symbol: "circle"
                }
			}
		]
	});
}
