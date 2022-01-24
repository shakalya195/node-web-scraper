node-web-scraper
================

Simple web scraper to get a movie name, release year and community rating from IMDB.
To run this example use the following commands:

``` shell
$ npm install
$ node server.js
```

 Then it will start up our node server, navigate to http://localhost:8081/ and see what happens.


 Put the URL like "https://www.1mg.com/sitemap.xml";
 it will be collecting nested xml from the root sitemap.xml
 and make an entry into mongodb database "node-web-scrapper" collection "urls" for each other links then xml.

which cna be further used for crapping One by One.