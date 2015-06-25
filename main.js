var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "base";
var sceneName = "main";

window.onload = main;

var config;
var client;
var scene;

var packetsToSend = 0;
var intervalId;
var packetId = 0;
var lastPacketIdToWait;

var liveChart = false;

var tests = [];

var packets = {};

function main()
{
	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, "{isObserver:false}").then(function(sc) {
		scene = sc;
		scene.registerRouteRaw("echo", onEcho);
		return scene.connect().then(function() {

			console.log("CONNECTED");

			//tests.push(test_0);
			
			tests.push(test_1);
			tests.push(test_1);
			//tests.push(test_3);
			//tests.push(test_2);
			//tests.push(test_1);

			//tests.push(test_4);

			tests.push(createChart);

            execNextTest();
		});
	});
}

function execNextTest()
{
	if (tests.length)
	{
		var test = tests.shift();
		test();
	}
}

var chartData = [];

function onEcho(dataView)
{
	var thisPacketId = dataView.getUint32(0);
	var ping = performance.now() - packets[thisPacketId];
	delete packets[thisPacketId];

	chartData.push([thisPacketId, ping]);

	if (lastPacketIdToWait === thisPacketId)
	{
		execNextTest();
	}

	if (liveChart)
	{
		if (chart.series[0].data.length > 40)
		{	
			chart.series[0].removePoint(0);
		}
		chart.series[0].addPoint([thisPacketId, ping], true, false);
	}
}

if (liveChart)
{
	createChart();
}

function test_0()
{
	console.log("test_0", packetId);

	packetsToSend = 10;
	intervalId = setInterval(sendPacket, 100);
}

function test_1()
{
	console.log("test_1", packetId);

	packetsToSend = 10;
	intervalId = setInterval(sendPacket, 100);
}

function test_2()
{
	console.log("test_2", packetId);

	packetsToSend = 100;
	intervalId = setInterval(sendPacket, 10);
}

function test_3()
{
	console.log("test_3", packetId);

	packetsToSend = 1000;
	intervalId = setInterval(sendPacket, 1);
}

function test_4()
{
	console.log("test_4", packetId);

	packetsToSend = 1000;
	intervalId = setInterval(sendPacket, 10);
}

function sendPacket()
{
	var id = packetId;
	packetId++;
	var buffer = new ArrayBuffer(4);
	var dataView = new DataView(buffer);
	dataView.setUint32(0, id);
	scene.sendPacket("echo", new Uint8Array(buffer), Stormancer.PacketPriority.HIGH_PRIORITY, Stormancer.PacketReliability.UNRELIABLE);

	packets[id] = performance.now();

	packetsToSend--;
	if (packetsToSend === 0)
	{
		lastPacketIdToWait = id;
		if (intervalId)
		{
			clearInterval(intervalId);
		}
	}	
}

var chart;
function createChart()
{
	chart = new Highcharts.Chart({
		chart: {
			renderTo: 'container',
			animation: false
		},
		title: {
			text: 'Stats'
		},
		xAxis: {
			title: {
				text: 'Packet Id'
			}
		},
		yAxis: {
			title: {
				text: 'Ping'
			},
			min: 0
		},
		series: [{
			name: 'Ping',
			data: chartData,
			animation: false
		}]
	});
}