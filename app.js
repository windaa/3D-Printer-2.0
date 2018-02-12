		// import package
		var express = require('express');
		var app = express();
		var bodyParser = require('body-parser');
		var mongoose = require('mongoose');
		var upload = require('express-fileupload');
		var Odoo = require('odoo');
		var Odooxml = require('odoo-xmlrpc');
		var fs = require('fs');

		// mongooDB connection

		var uri = 'mongodb://3DP_INF:3dpinf@ds163701.mlab.com:63701/3dp_inf';
		mongoose.Promise = global.Promise;
		mongoose.connect(uri);
		var db = mongoose.connection;

		db.on("error", console.error.bind(console, "connection error"));
		db.once("open", function (callback) {
			console.log("connection with database are establish");
		});

		// odoo connection

		var odoo = new Odoo({
			host: 'localhost',
			port: 8069,
			database: '3dp',
			username: '3dpinformatik@gmail.com',
			password: 'raspberry'
		});

		// odoo xmlrpc
		var odooX = new Odooxml({
			url: 'localhost',
			port: 8069,
			db: '3dp',
			username: '3dpinformatik@gmail.com',
			password: 'raspberry'
		});


		// basic settings for application
		app.use(bodyParser.urlencoded({extended:true}));
		app.use(bodyParser.json());
		app.use(express.static(__dirname + '/public'));
		app.use(upload());
		app.set('view engine', 'ejs');

		// initiate server
		app.listen(3000);
		console.log('Running on port 3000...');

		// global variable
		var embedDataTable = new Array();
		var embedFilename = "";
		var embedLength = "";
		var embedWeight = "";
		var embedStatus = "";


		// update material Odoo --> Mongodb
		var matNameOdoo;
		var weightOdoo;

		odoo.connect(function (err) {
			if (err) { 
				return console.log(err); 
			} 
			else {
				console.log('odoo connected')

				var params = {
					fields: ['name','weight', 'volume'],
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
													 var myQuery = {materialName:matNameOdoo};
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
		
		app.get('/check', function(req, res){
			db.collection("current_material").find({}).toArray(function(err, data) {
			if (err) throw err;
			res.render('material.ejs', {datas:data});
			});			
		});

		app.get('/file', function(req, res){
			res.render('submit.ejs');	
		});

		/**
		app.post('/upload', function(req, res){
			res.render('status.ejs',
			{ 
								filename: "embedFilename",
								lengthEjs: "embedLength",
								weightEjs: "embedWeight",
								available : "embedStatus"
			});	
		});
		**/

		app.post('/upload', function(req, res) { 
			
			if(req.files) {
				var file = req.files.filename;
				var filename = file.name;
				var fileInString;
				var filament;
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


					// Embed Variable
					embedFilename = filename;
					embedLength = filamentWithoutSpace;
					embedWeight = weight;


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
							embedStatus = "Material is not available"

							console.log("unavailable");
							res.render('status.ejs',
							{ 
								filename: embedFilename,
								lengthEjs: embedLength,
								weightEjs: embedWeight,
								available : embedStatus
							});
						} 
						else 
						{

						   			// upload gcode file to octoprint
						   			// unwrappeduploadToOctoprint(filename);

						   			embedStatus = "Material is available";

						   			console.log("available");
						   			var myobj = { materialID: mi, lange: embedLength, filamentWeight: embedWeight };

									// insert to request_material
									db.collection("request_material").insertOne(myobj, function(err, res) {
										if (err) throw err;
										console.log("1 document inserted");
									});

									// update
									newWeight = (data.filamentWeight - weight);
									var myparam = { materialID: mi };
									var newValue = { $set: {filamentWeight:newWeight}};

									db.collection("current_material").updateOne(myparam, newValue, function(err, res) {
										if (err) throw err;
										console.log("1 document updated");
									}); 

									console.log(mi);
									console.log(newWeight);

									// render
									res.render('status.ejs',
									{ 
										filename: embedFilename,
										lengthEjs: embedLength,
										weightEjs: embedWeight,
										available : embedStatus
									});
								}
							});
				});

							// update Odoo
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

		unwrappeduploadToOctoprint = function(x){
			FormData = require('form-data'),
			fs = require('fs') ;
			var request = require("request");

			var form ={
				file: {
					value: fs.createReadStream('uploads/'+ x),
					options: {filename: x}
				}
			};

			var options = {
				method: 'POST',
		    url: 'http://192.168.137.240/api/files/local', // need to modify if the ip changed
		    headers: { 'x-api-key': '4E2F97268A004C30BFC84FD9D9070C47'},
		    formData: form
		};

		var req = request(options, function (error, response, body) {
			if (error) throw new Error(error);
			console.log(body);
		});
	};




