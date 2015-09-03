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
		scene.registerRoute("echo", test_echo_receive);
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
		console.log("test_rpc: data received");
		data = packet.readObject();
		if (data === "stormancer")
		{
			validTest("rpc");
			execNextTest();
		}
	});
}

function test_syncclock()
{
	console.log("test_syncclock: start");

	setTimeout(function() {
		console.log("test_syncclock: check sync clock");
		if (client.clock())
		{
			validTest("syncclock");
			execNextTest();
		}
		else
		{
			test_syncclock();
		}
	}, 100);
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
