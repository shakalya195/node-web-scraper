const express = require('express');
const http = require('http');
const https = require('https');
const fs      = require('fs');
const flow = require('xml-flow');
const request = require('request');
const cheerio = require('cheerio');
const transform = require('camaro');
const app     = express();

const mongoose = require('mongoose');
const { text } = require('cheerio/lib/api/manipulation');
const { data } = require('cheerio/lib/api/attributes');

mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost:27017/one-mg", {
     useNewUrlParser: true,
     useUnifiedTopology: true 
     }).then(success => {
    console.log('MONGO DB CONNECTED')
}).catch(err => {
    process.exit(1);
});

app.set('view engine', 'ejs');
app.use(express.urlencoded());
app.use(express.json());
// use res.render to load up an ejs view file


const UrlSchema = new mongoose.Schema({
    id: {type:Number},
    name: {type:String}, 
    url: {type: String, trim: true, unique: true },
    schema: {type: Object},
    type: {type:String, trim:true},
  },
  { 
    timestamps: true 
  }
);

var UrlDocument = mongoose.model('url', UrlSchema);

// index page
app.get('/', function(req, res) {
  var site = 'https://www.1mg.com/sitemap.xml';
  res.render('pages/index',{site:site});
});

// about page
app.get('/scrap', function(req, res) {
  var site = 'https://www.1mg.com/drugs/hp-kit-145048';
  site = "https://www.1mg.com/drugs/otrizest-mini-nasal-drops-476475";
  res.render('pages/scrap',{site:site, items:[]});
});

var number=0;
var links = [];
app.post("/sitelist", async function(req, res) {
  // console.log(req.body);
  var url = req.body.url;
  var data = await scrapXMLUrl(url);
  console.log('==============>',links.count);
  res.render('pages/single-xml', {
    data: data
  });

});


async function scrapXMLUrl(url){
  return new Promise((resolve, reject) => {
        https.get(url, (res) => {
        var filename = url.substring(url.lastIndexOf('/')+1);
        var file = fs.createWriteStream(filename);
        res.on('data', function(data) {
            file.write(data);
        }).on('end', function() {
            file.end();
            var inFile = fs.createReadStream(filename),
                xmlStream = flow(inFile);
            var array = [];
            xmlStream.on('tag:loc', async function(url) {
              var ext = url.$text.split('.').pop().trim();
              // console.log('================================>',ext)
                if( ext == 'xml'){
                  var arrayHTML = await scrapXMLUrl(url.$text);
                  array = [...array, ...arrayHTML];
                }else{
                  array.push({ id: number, url : url.$text });
                  number++;
                  let done = UrlDocument.collection.insertOne({url:url.$text},{}).catch(err=>{
                    // console.log('err==============>err===>',err);
                  })
                  // console.log('=======================>', done)
                  
                }                
            });
            xmlStream.on('end', function(url) {
                // console.log(array);
                links = [...links, ...array];
                resolve(array);
            });  
        });
      });
   
  }).catch((err)=>{
    console.log('ERROR===========>',err)
  });
}


app.post('/scrap', function(req, res){
  // Let's scrape Anchorman 2
  var url = req.body.url;
  var json = {};
  // console.log(url);
  request(url, async function(error, response, html){
    if(!error){
      var $ = cheerio.load(html);
      var h = $('h1').filter(function(){
        var data = $(this);
        json.title = data.text().trim();
      });
  
      if($("script[type='application/ld+json']").length){
        const jsonRaw = $("script[type='application/ld+json']")[0].children[0].data; 
        json.drug = JSON.parse(jsonRaw);
  
        if(json.drug['@type'] == 'Drug' || json.drug['@type'] == 'Drug'){
          let filter = {url: url};
          let update = {
            schema: json.drug,
            name: json.drug.name,
            id: url.match(/(?:-)(\d+)$/)[1],
            type: json.drug['@type']
          }
          let action = await UrlDocument.findOneAndUpdate(filter, update,{new:true}).catch((err)=>{});
          // console.log('action',action);
          
          res.status(200).send(url);
        }else{
          
          res.status(202).send(url);
        }
      }else{
       
        res.status(202).send(url);
      }

    }else{
      
      res.status(202).send(url);
    }
    // console.log("200");
    // res.status(200).send(url);
  })
})


// index page
app.get("/urls", (req, res) => {
  var skip = parseInt(req.query.skip) || 0; //for next page pass 1 here
  var limit = parseInt(req.query.limit) || 10;
  var name = req.query.name || '';
  var query = { 
    name:{ $exists : false }, // exclude if name key exists
    url: { "$regex": name, "$options": "i" }
   }
  // console.log('skip',skip,'limit',limit,'name',name)
  UrlDocument.find(query)
    .skip(skip) //Notice here
    .limit(limit)
    .exec((err, doc) => {
      if (err) {
        return res.json(err);
      }
      UrlDocument.countDocuments(query).exec((count_error, count) => {
        if (err) {
          return res.json(count_error);
        }
        return res.json({
          total: count,
          pageSize: doc.length,
          items: doc
        });
      });
    });
});


app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;
