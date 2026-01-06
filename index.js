require('dotenv').config();
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { url } = require('inspector');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

// Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
mongoose.connect(process.env.MONGO_URI)

// Define schema
const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

const counterSchema = new mongoose.Schema({
  counter: Number
})
const Counter = mongoose.model("Counter", counterSchema);

// Define functions to interact with Counter
const findOrCreateCounter = async (done) => {
  try {
    const counter = new Counter({
      counter: 1
    });
    const data = await counter.save();
    done(null, data);
  } catch (err) {
    console.error(err);
    done(err);
  }
}

const findAndIncrementCounter = async (done) => {
  // find and update counter
}

// Define functions to interact with ShortUrls
// const createAndSaveUrl = async (url, done) => {
//   try {
//     // find counter, get its value, increment it
//     const shortUrlDoc = new ShortUrl({
//       original_url: url,
//       short_url: 1
//     });
//     const data = await shortUrlDoc.save();
//     done(null, data);
//   } catch (err) {
//     console.error(err);
//     done(err);
//   }
// }

const findFromShort = async (shortUrl, done) => {
  try {
    const data = await ShortUrl.findOne({short_url: shortUrl});
    done(null, data);
  } catch (err) {
    console.error(err);
    done(err);
  }
}

// const findFromOriginal = async (originalUrl, done) => {
//   try {
//     const data = await ShortUrl.findOne({original_url: originalUrl});
//     done(null, data);
//   } catch (err) {
//     console.error(err);
//     done(err);
//   }
// }

const findOrCreateUrl = async (url, done) => {
  try {
    let doc = await ShortUrl.findOne({original_url: url});

    if (!doc) {
      doc = new ShortUrl({original_url: url, short_url: 1});
      doc = await doc.save();
      console.log("Created new doc!");
    } else {
      console.log("Found previous doc!");
    }

    done(null, doc);
  } catch (err) {
    done(err);
  }
}

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.get('/api/shorturl/:id?', function(req, res) {
  // check database for record with the shorturl
  findFromShort(req.params.id, function(err, data) {
    if (err) return res.json({error: 'Database error'});
    if (!data) return res.json({error: 'No short URL found for the given input'})
    res.redirect(data.original_url);
  });
});

app.post('/api/shorturl', function(req, res) {
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
        return res.json({error: "Invalid Hostname"});
      }

      findOrCreateUrl(inputUrl, function (err, data) {
        if (err) return res.json({error: "Database error"});
        res.json({original_url: data.original_url, short_url: data.short_url});
      });
    }
  );
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
