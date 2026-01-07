require('dotenv').config();
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => resetDatabase())
  .catch(err => console.error(err));

// Define schema
const shortUrlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  }
});
const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

const findOriginalFromShort = async (shortUrl, done) => {
  try {
    const data = await ShortUrl.findById(shortUrl);
    done(null, data);
  } catch (err) {
    console.error(err);
    done(err);
  }
}

const findOrCreateUrl = async (url, done) => {
  try {
    let doc = await ShortUrl.findOne({original_url: url});

    if (!doc) {
      doc = new ShortUrl({original_url: url});
      doc = await doc.save();
    }

    done(null, doc);
  } catch (err) {
    console.error(err)
    done(err);
  }
}

const resetDatabase = async () => {
  await ShortUrl.deleteMany({});
}

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// for testing purposes
app.get('/api/reset', async function(req, res) {
  resetDatabase();
  res.send("Database cleared!");
});

app.get('/api/shorturl/:id', async function(req, res) {
  console.log("GET URL");
  console.log('req.body:', req.body);
  console.log('req.params:', req.params);
  console.log('req.query:', req.query);

  const shortUrlId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(shortUrlId)) {
    return res.json({error: 'invalid url'});
  }

  findOriginalFromShort(shortUrlId, function(err, data) {
    if (err) return res.json({error: 'Database error'});
    if (!data) return res.json({error: 'invalid url'});
    console.log(data);
    res.redirect(data.original_url);
  });
});

app.post('/api/shorturl', function(req, res) {
  console.log("POST URL");
  console.log('req.body:', req.body);
  console.log('req.params:', req.params);
  console.log('req.query:', req.query);

  const inputUrl = req.body.url;

  let hostname;
  try {
    hostname = new URL(inputUrl).hostname;
  } catch {
    return res.json({error: 'invalid url'});
  }

  dns.lookup(
    hostname, 
    (err) => {
      if (err) {
        return res.json({error: 'invalid url'});
      }

      findOrCreateUrl(inputUrl, function (err, data) {
        if (err) return res.json({error: "Database error"});
        console.log(data);
        res.json({original_url: data.original_url, short_url: data._id});
      });
    }
  );
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
