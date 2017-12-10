var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var upload = require('express-fileupload');

// Alternative 2
var fs = require('fs');
var restler = require('restler');

// Alternative 3
var Client = require('node-rest-client').Client;
var client = new Client();
// var args;

//connect to mongoose
var uri = 'mongodb://3DP_INF:3dpinf@ds163701.mlab.com:63701/3dp_inf';
mongoose.Promise = global.Promise;
mongoose.connect(uri);
var db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error"));
db.once("open", function (callback) {
  console.log("connection with database are establish");
});

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use(upload());
app.set('view engine', 'ejs');

app.listen(3000);
console.log('Running on port 3000...');

app.get('/', function(req, res){
	res.render('index.ejs');
});

app.get('/submit', function(req, res){
	res.render('submit.ejs');
});


app.get('/check', function(req, res){

	/**
	db.collection("current_material").findOne({materialID:'1001'}, function(err, data) {
		console.log(data)
		res.render('material.ejs',
			{	matID:data.materialID,	
				matName:data.materialName,
				matFarbe:data.materialFarbe,
				matFil:data.filament
			});
	});
	**/

	// Test comment

	db.collection("current_material").find({}).toArray(function(err, data) {
    if (err) throw err;
    console.log(data);
    res.render('material.ejs', {datas:data});
  	});

	/**
	var array = [];
	var cursor = db.collection("current_material").find({});
	cursor.forEach(function(err, data){
		array.push(data.materialID);
		res.render('material.ejs', {datas:array});
	});
	**/
});

app.get('/help', function(req, res){
	res.render('help.ejs');
});

app.post('/upload', function(req, res){
	
	if(req.files) {
		var file = req.files.filename;
		var filename = file.name;
		var fileInString;
		

		file.mv('./uploads/' + filename);

		fs.readFile('./uploads/' + filename, 'utf8', function (err,data) {
		  if (err) {
		    return console.log(err);
		  }
		  fileInString = data;
		  console.log(fileInString);

		  	var words = fileInString.split(";");
			var list = [];
			var filament;
			var materialdichte;
			console.log(words);

			for(var i = 0; i < words.length; i++) {
			    var part = [];
			    list[i] = words[i];
				part = list[i].split(":");
			 	if(part[0] == "Filament used") {
			        filament = part[1];
			    }
			    else if(part[0] == "Layer height") {
			        materialdichte = part[1];
			    }
			}

			console.log(filament);

			var filamentWithoutMeter = filament.replace("m","");
			var filamentWithoutSpace = filamentWithoutMeter.trim();

			var materialdichteWithoutSpace = materialdichte.trim();

			var filamentNum = parseFloat(filamentWithoutSpace);
			var materialdichteNum = parseFloat(materialdichteWithoutSpace);

			res.render('uploadInfo.ejs',
			{ 
				filename: filename,
				filament: filamentWithoutSpace
			});

		});

	 	

		
		
		// Alternative 1
		/** 
		const data = document.getElementById('pushData');
			data.addEventListener('submit', (e) => {
			e.preventDefault()
			const formData = new formData(data)
			fetch('192.168.137.20/api/files/local', {
			method: 'POST',
			body: formData,
			headers: {
				'x-api-key' : '4E2F97268A004C30BFC84FD9D9070C47'
			}
		})
		})	
		**/

		// Alternative 2
		/**
		fs.stat(filename, function(err, stats) {
    	restler.post("http://192.168.137.20/api/files/local", {
        multipart: true,
        headers:{
        	'x-api-key' : '4E2F97268A004C30BFC84FD9D9070C47'
        },
    	file: req.files.filenames
    	}).on("complete", function(data) {
        console.log(data);
    	});
		});
		**/
		

		// Alternative 3
		/**
		var args = {
			data: file,
			headers: {
				'x-api-key' : '4E2F97268A004C30BFC84FD9D9070C47'
			}
		};

		client.post('http://192.168.137.20/api/files/local', args, function (data, response) {
    	console.log(req.files);
		});
		**/
	}

	

});