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
	tests.push(test_connection);
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

function test_connection()
{
	console.log("test_connection", "connecting to a scene");

	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, {}).then(function(sc) {
		scene = sc;
		return scene.connect().then(function() {
			validTest("connection");
    		execNextTest();
		});
	});
}
