'use strict'

var express = require('express');
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var swig = require('swig');
var nodeuuid = require('node-uuid');
var loki = require('lokijs');

var db = new loki('database.json', { 'autosave': true });
var app = express();
var filesData;


app.use(express.static(path.join(__dirname, 'public')));

app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.set('view cache', false);

swig.setDefaults({ cache: false });


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'views/upload.html'));
});

app.post('/upload', function (req, res) {

    var form = new formidable.IncomingForm();
    var uuid = nodeuuid.v4();
    form.multiples = false;
    form.uploadDir = path.join(__dirname, '/uploads');


    form.on('file', function (field, file) {

        var fileName = file.name;
        var filePath = path.join(form.uploadDir, uuid);
        var newFilePath = path.join(filePath, file.name);
        var count = 0;

        fs.mkdirSync(filePath);

        fs.rename(file.path, newFilePath);

        filesData.insert({ 'id': uuid, 'fileName': file.name, 'path': newFilePath });
    });

    form.on('fileBegin', function (name, file) {

    });

    form.on('error', function (err) {
        console.log('An error has occured: \n' + err);
        res.end();
    });

    form.on('end', function () {
        res.json({ downloadPath: req.get('host') + '/dw/' + uuid });
    });

    form.parse(req);

});

app.get('/dw/:downloadId', function (req, res) {
    var fileEntry = filesData.find({ 'id': req.params.downloadId });

    if (fileEntry.length > 0) {
        res.render('download.html', { 'fileName': fileEntry[0].fileName, 'filePath': '/dw/s/' + fileEntry[0].id });
    } else {
        res.redirect('/');
    }

});

app.get('/dw/s/:downloadId', function (req, res) {

    var fileEntry = filesData.find({ 'id': req.params.downloadId });

    if (fileEntry.length > 0) {
        res.download(fileEntry[0].path);
    } else {
        res.redirect('/');
    }

});

app.use(function (req, res, next) {
    res.status(404).send('404');
});

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('500');
});


var server = app.listen(3000, function () {
    console.log('Server listening on port 3000');

    db.loadDatabase({}, function () {
        filesData = db.getCollection("files");

        if (filesData == null) {
            filesData = db.addCollection('files');
        }
    });
});
