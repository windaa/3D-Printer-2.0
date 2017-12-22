var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var upload = require('express-fileupload');
var Odoo = require('odoo');
var Odooxml = require('odoo-xmlrpc');

// Alternative 2
var fs = require('fs');
var restler = require('restler');

// Alternative 3
var Client = require('node-rest-client').Client;
var client = new Client();
// var args;


var vorhanden;

//connect to mongoose
		var uri = 'mongodb://3DP_INF:3dpinf@ds163701.mlab.com:63701/3dp_inf';
		mongoose.Promise = global.Promise;
		mongoose.connect(uri);
		var db = mongoose.connection;

		db.on("error", console.error.bind(console, "connection error"));
		db.once("open", function (callback) {
		  console.log("connection with database are establish");
		});



// Odoo1 Connection

		var odoo = new Odoo({
		  host: 'localhost',
		  port: 8069,
		  database: '3dp',
		  username: '3dpinformatik@gmail.com',
		  password: 'raspberry'
		});

// Odoo xmlrpc
		var odooX = new Odooxml({
		    url: 'localhost',
		    port: 8069,
		    db: '3dp',
		    username: '3dpinformatik@gmail.com',
		    password: 'raspberry'
		});



app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use(upload());
app.set('view engine', 'ejs');

app.listen(3000);
console.log('Running on port 3000...');


//Update Material Odoo --> Mongodb
		var matNameOdoo;
		var weightOdoo;

			odoo.connect(function (err) {
			  if (err) { 
			  	return console.log(err); 
			  } 
			  else {
					  	console.log('odoo connected')

					  	var params = {
										fields: [ 'name','weight', 'volume'],
										limit: 5,
										offset: 0,  
									 }; 

						odoo.browse_by_id('product.product', params, function (err, products) 
						{
						  	
							if (err) { return console.log(err); }
							 
							for(var i = 0; i < products.length; i++)
									{
										 //console.log(products.length);
										 matNameOdoo = products[i].name;
										 weightOdoo = products[i].weight;
										 console.log(matNameOdoo + ";" + weightOdoo);

										 // Update
										var myQuery = { materialName: matNameOdoo };
										var newValues = { $set: {filamentWeight:weightOdoo}};

										db.collection("current_material").updateOne(myQuery, newValues, function(err, res) {
											if (err) throw err;
										}); 
									}

						}); 
					}
			});




app.get('/', function(req, res){
	res.render('index.ejs');
});

app.get('/submit', function(req, res){
	res.render('submit.ejs');
});

// go to home
app.get('/index', function(req, res, next){
	res.render('index.ejs', { meldung: ''});
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



app.post('/upload', function(req, res) { 
	
	if(req.files) {
		var file = req.files.filename;
		var filename = file.name;
		var fileInString;
		var filament; //länge des Materials von Auftrag
		var filamentWithoutMeter;
		var filamentWithoutSpace;
		var filamentNum;
		var words;
		var list = [];
		var volume;
		var weight;
		var mi;
		var newWeight;
		

		file.mv('./uploads/' + filename);

		fs.readFile('./uploads/' + filename, 'utf8', function (err,data) {
				  if (err) {
				    return console.log(err);
				  }
			  
			fileInString = data;
			 //console.log(fileInString);

		  	words = fileInString.split(";");

			
			for(var i = 0; i < words.length; i++) {
			    var part = [];
			    list[i] = words[i];
				part = list[i].split(":");
			 	if(part[0] == "Filament used") {
			        filament = part[1];
			    }
			}

			console.log(filament);
			
			filamentWithoutMeter = filament.replace("m","");
			filamentWithoutSpace = filamentWithoutMeter.trim();
			filamentNum = parseFloat(filamentWithoutSpace);


			filamentWithoutMeter = filament.replace("m","");
			filamentWithoutSpace = filamentWithoutMeter.trim();
			filamentNum = parseFloat(filamentWithoutSpace);
			
			filamentWithoutMeter = filament.replace("m","");
			filamentWithoutSpace = filamentWithoutMeter.trim();
		
			filamentNum = parseFloat(filamentWithoutSpace);


			mi = req.body.MatID;
			console.log(JSON.stringify(mi));

			db.collection("current_material").findOne({materialID:mi},function(err, data) {
			    if (err) throw err;
			    console.log(filamentNum);
			    console.log(data.filamentWeight);

			    volume = filamentNum * 3.14 * (data.DuchmesserFilament / 2) * (data.DuchmesserFilament / 2);
			    console.log(volume);
			    weight = volume * data.MaterialDichte
			    console.log(weight);


			   		if(weight > data.filamentWeight)
			   			{
				   			console.log("unavailable");
				   			res.render('uploadInfo.ejs',
							{ 
							filename: filename,
							lengthEjs: filamentWithoutSpace,
							weightEjs: weight,
							available : "Material is not available"
							});
				   		} 
				   		else 
				   		{
							console.log("available");
							var myobj = { materialID: mi, lange: filamentWithoutSpace, filamentWeight: weight };
							
							// Insert to request_material
							db.collection("request_material").insertOne(myobj, function(err, res) {
								    if (err) throw err;
								    console.log("1 document inserted");
								 });

							// Update
							newWeight = (data.filamentWeight - weight);
							var myparam = { materialID: mi };
							var newValue = { $set: {filamentWeight:newWeight}};

							db.collection("current_material").updateOne(myparam, newValue, function(err, res) {
								    if (err) throw err;
								    console.log("1 document updated");
								}); 

							console.log(mi);
							console.log(newWeight);

							// Render
					   		res.render('uploadInfo.ejs',
							{ 
								filename: filename,
								lengthEjs: filamentWithoutSpace,
								weightEjs: weight,
								available : "Material is available"

							});
			   			}
		  	});
		});

					odooX.connect(function (err) {
					    if (err) { return console.log(err); }
					    console.log('Connected to Odoox server.');

					    var id = parseFloat(mi);
					    var vol= (newWeight/1.24);

					    var inParams = [];
					    inParams.push([id]); //id to update
					    inParams.push({'weight': newWeight},{'volume': vol});
					    console.log(mi);
					    console.log(newWeight);
					    console.log(vol);
					    var params = [];
					    params.push(inParams);
					    odooX.execute_kw('product.product', 'write', params, function (err, products) {
						        if (err) { return console.log(err); }
						        console.log('Result: ', products);
					    	});
					});

					odooX.connect(function (err) {
					    if (err) { return console.log(err); }
					    console.log('Connected to Odoox server.');

					    var id2 = parseFloat(mi);
					    var vol= (newWeight/1.24);

					    var inParams2 = [];
					    inParams2.push([id2]); //id to update
					    inParams2.push({'volume': vol});
					    var params2 = [];
					    params2.push(inParams2);
					    odooX.execute_kw('product.product', 'write', params2, function (err, products) {
						        if (err) { return console.log(err); }
						        console.log('Result: ', products);
						    });
					});

	}
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