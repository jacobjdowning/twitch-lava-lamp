// TODO:
// add wobble to heartbeat and reconnect
// use opaque value for message validation
// implement cheer queue
// handle disconnects
// gracefully deal with bad location hash

const clientIdLocal = '9a201y5ou70sxvzs06aq4wki2k5gyq'; 
const clientId = '1tkm4mk7k44j913wfap81tqallsm0q'
const redirectURILocal = 'http://localhost:5000';
const redirectURI = 'http://jacobjdowning.github.io/twitch-lava-lamp/'
const scope = 'bits:read user_read';
const forceVerify = 'true';
const animationDuration = 1000;
const heartbeatInterval = 60000;
const testInterval = 3000;
const minBitsUsed = 100;
// const availableColors = ["#FB0000", "#FB8500", "#FBCD00", "#27C205",
// 						 "#0055FF", "#A600FF", "#FF008F"];
const availableColors = ["rgb(251,0,0)", "rgb(251,133,0)", "rgb(251,205,0)", "rgb(39,194,5)",
						 "rgb(0,85,255)", "rgb(166,0,255)", "rgb(255,0,143)"];
var keyframPairMatrix;

function authUrl() {
	var isLocal = document.location.href.includes('localhost');
	var url = "https://id.twitch.tv/oauth2/authorize?response_type=token"+
			"&client_id="+ (isLocal ? clientIdLocal : clientId) +
			"&redirect_uri="+ (isLocal ? redirectURILocal : redirectURI) +
			"&scope="+scope+
			"&force_verify="+forceVerify;
	return url;
}

function parseHash(hash) {
	var marker = "#access_token=";
	var amp = "&"
	var start = hash.search(marker);
	hash = hash.substring(start+marker.length);
	var end = hash.search(amp);
	hash = hash.substring(0, end);
	return hash;	
}

function promiseSocket(uri) {
	return new Promise((resolve, reject) => {
		var socket = new WebSocket(uri)
		socket.onopen = () => resolve(socket);
		socket.onerror = (err) => reject(err); 
	})
}

function findChannel(){
	var headers = new Headers({
		'Accept': 'application/vnd.twitchtv.v5+json',
		'Client-ID': clientId,
		'Authorization': 'OAuth ' + sessionStorage.token
	});

	return fetch('https://api.twitch.tv/kraken/user',{headers: headers});
}

function connect(){
	var socket
	var fetched = Promise.all([promiseSocket('wss://pubsub-edge.twitch.tv'),
				 				findChannel()]);
	fetched.then((results) => {
		results[0].onmessage = recieved;
		console.log("Sent: " + heartbeat(results[0]));
		setInterval(() => heartbeat(results[0]), heartbeatInterval)

		results[1].json().then(json =>{
			listen(json._id, results[0]);
		})
	})
	.catch(err=>console.log(err));
}

function recieved(event){
	console.log("Recieved: " + event.data);
	var msg = JSON.parse(event.data);
	if(msg.type == "MESSAGE"){
		if(msg.data.topic.includes('channel-bits-events-v2')){
			if(JSON.parse(msg.data.message).data.bits_used >= minBitsUsed){
				animateLava();
			}
		}
	}
}

function heartbeat(socket) {
	var message = {
		type: 'PING'
	};
	var jsons = JSON.stringify(message);
	socket.send(jsons);
	return jsons
}

function listen(id, socket) {
	var message = {
		"type": "LISTEN",
		"data":{
			"topics": ["channel-bits-events-v2."+id.toString()],
			"auth_token": sessionStorage.token
		}
	}
	var stringmessage = JSON.stringify(message);
	socket.send(stringmessage);
	return stringmessage;	
}

function testmessage() {
	msg = {
  			"type": "MESSAGE",
  			"data": {
     		"topic": "channel-bits-events-v2.46024993",
     		"message": "{\"data\":{\"user_name\":\"jwp\",\"channel_name\":\"bontakun\",\"user_id\":\"95546976\",\"channel_id\":\"46024993\",\"time\":\"2017-02-09T13:23:58.168Z\",\"chat_message\":\"cheer10000 New badge hype!\",\"bits_used\":100,\"total_bits_used\":25000,\"context\":\"cheer\",\"badge_entitlement\":{\"new_version\":25000,\"previous_version\":10000}},\"version\":\"1.0\",\"message_type\":\"bits_event\",\"message_id\":\"8145728a4-35f0-4cf7-9dc0-f2ef24de1eb6\",\"is_anonymous\":true}"
 	 		}
 	 	}
 	var event = new Object();
 	event.data = JSON.stringify(msg);
 	recieved(event);
 }

function displayAuth() {
	var auth = document.getElementById('auth-div');
	auth.setAttribute('style', '');
	auth.getElementsByTagName('a')[0].setAttribute('href', authUrl());
}

function buildFramePairMatrix(colors) {
	var matrix = new Array(colors.length);
	for (var i = colors.length - 1; i >= 0; i--) {
		matrix[i] = new Array(colors.length)
		for (var j = colors.length - 1; j >= 0; j--) {
			matrix[i][j] = [{
				backgroundColor: colors[i]
			},
			{
				backgroundColor: colors[j]
			}];
		}
	}
	return matrix;
}

function findIndexInArray(target, arr) {
	if (typeof arr != 'object') {
		return -1;
	}
	for (var i = arr.length - 1; i >= 0; i--) {
		if (arr[i].replace(/ /g, '') == target.replace(/ /g, '')){
			return i;
		}
	}
	return -1;
}

function getRandomFramePairFrom(color){
	var fromIndex = findIndexInArray(color, availableColors);
	if (fromIndex == -1) {
		console.error("getRandomFramePairFrom recieved color that is not in availableColors");
		return keyframPairMatrix[0][0];
	}
	var toIndex = 0;
	do{
		toIndex = Math.floor(Math.random() * availableColors.length);
	}while(toIndex == fromIndex) // Makes sure toIndex != fromIndex
	return keyframPairMatrix[fromIndex][toIndex];
}

function animateLavaBlob(blob, keyframes){
	blob.animation = blob.animate(keyframes, animationDuration);
	blob.animation.onfinish = () => {
		blob.style.backgroundColor = keyframes[1].backgroundColor;
	};
}

function animateLava(){
	var blobs = document.getElementById('wrapper')
			.querySelectorAll('.lava .top, .lava li, .lava .bottom');

	var keyframes = getRandomFramePairFrom(blobs[0].style.backgroundColor);
	blobs.forEach(blob => {
		if(!(typeof blob.animation == 'object' && blob.animation.currentTime != animationDuration)){
			animateLavaBlob(blob, keyframes);
		}
	});
}

function setLavaBgc() {
	var blobs = document.getElementById('wrapper')
		.querySelectorAll('.lava .top, .lava li, .lava .bottom');
	blobs.forEach(blob => blob.style.backgroundColor = availableColors[0]);
}

function main() {
	if(document.location.hash == ''){
		displayAuth();
	}else{
		keyframPairMatrix = buildFramePairMatrix(availableColors);
		setLavaBgc();
		document.getElementById('wrapper').style.display = 'initial';
		if(document.location.hash == '#test'){
			setInterval(animateLava, testInterval)
		}else{
			sessionStorage.token = parseHash(document.location.hash);
			connect();
		}
	}
}
