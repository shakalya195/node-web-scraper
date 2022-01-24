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

mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost:27017/node-web-scrapper", {
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
    url: {type: String, trim: true, default: null},
});
var UrlDocument = mongoose.model('url', UrlSchema);

// index page
app.get('/', function(req, res) {
  var site = 'https://www.1mg.com/sitemap.xml';
  res.render('pages/index',{site:site});
});

// about page
app.get('/about', function(req, res) {
  res.render('pages/about');
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
                  UrlDocument.collection.insertOne({url:url.$text},{});
                }                
            });
            xmlStream.on('end', function(url) {
                console.log(array);
                links = [...links, ...array];
                resolve(array);
            });  
        });
      });
   
  });
}


app.get('/scrape', function(req, res){
  // Let's scrape Anchorman 2
  url = 'http://www.imdb.com/title/tt1229340/';

  request(url, function(error, response, html){
    if(!error){
      var $ = cheerio.load(html);

      var title, release, rating;
      var json = { title : "", release : "", rating : ""};

      $('h1').filter(function(){
        var data = $(this);
        title = data.text().trim();
        release = data.text().trim();

        json.title = title;
        json.release = release;
      })

      $('.AggregateRatingButton__RatingScore-sc-1ll29m0-1').filter(function(){
        var data = $(this);
        rating = data.text().trim();
        json.rating = rating;
      })
    }

    fs.writeFile('output.json', JSON.stringify(json, null, 4), function(err){
      console.log('File successfully written! - Check your project directory for the output.json file');
    })

    res.send('Check your console!',json);
  })
})

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;
