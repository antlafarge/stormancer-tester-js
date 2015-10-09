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
