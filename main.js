// TODO:
// add wobble to heartbeat and reconnect
// use opaque value for message validation
// handle bits during animation
// handle disconnects
// use two sets of colours for lava
// smooth animation when switching directions
// gracefully deal with bad location hash

// const clientId = '9a201y5ou70sxvzs06aq4wki2k5gyq'; 
const clientId = '1tkm4mk7k44j913wfap81tqallsm0q'
// const redirectURI = 'http://localhost:5000';
const redirectURI = 'http://jacobjdowning.github.io/twitch-lava-lamp/'
const scope = 'bits:read user_read';
const forceVerify = 'true';
const animationDuration = 1000;
const highlightDuration = 10000;
const heartbeatInterval = 60000;

function authUrl() {
	var url = "https://id.twitch.tv/oauth2/authorize?response_type=token"+
			"&client_id="+clientId+
			"&redirect_uri="+redirectURI+
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
		animateLava();
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

function displayAuth() {
	var auth = document.getElementById('auth-div');
	auth.setAttribute('style', '');
	auth.getElementsByTagName('a')[0].setAttribute('href', authUrl());
}

function animateLavaBack(blob, keyframes){
	return setTimeout(() => {
					blob.timeout = null;
					blob.animate(keyframes, {duration:animationDuration, direction:"reverse"})
					.onfinish = () => {
						blob.style.backgroundColor = keyframes[0].backgroundColor;
					};
			}, highlightDuration);
}

function animateLavaForw(blob, keyframes){
	blob.animation = blob.animate(keyframes, animationDuration);
	blob.animation.onfinish = () => {
		blob.style.backgroundColor = keyframes[1].backgroundColor;
		if(typeof blob.timeout == 'number'){
			clearTimeout(blob.timeout);
		}
		blob.timeout = animateLavaBack(blob, keyframes);
	};
}

function animateLava(){
	console.log("start animation");
	mainKeys = [{
		backgroundColor:"#e54833"
	},
	{
		backgroundColor:"#77E533"
	}];

	altKeys = [{
		backgroundColor:"#f9db00"
	},
	{
		backgroundColor:"#E53377"
	}];

	var blobs = document.getElementById('wrapper')
			.querySelectorAll(".lava .top, .lava li, .lava .bottom");

	blobs.forEach(blob => {
		if(blob.timeout != null){
			clearTimeout(blob.timeout);
			blob.timeout = animateLavaBack(blob);
		}else if(!(typeof blob.animation == 'object' && blob.animation.currentTime != animationDuration)){
			if(blob.classList.contains('alt-color')){
				animateLavaForw(blob, altKeys);	
			}else{
				animateLavaForw(blob, mainKeys);
			}
		}
	});
}

function main() {
	if(document.location.hash == ''){
		displayAuth();
	}else{
		document.getElementById('wrapper').style.display = 'initial';
		sessionStorage.token = parseHash(document.location.hash);
		connect();
	}
}
