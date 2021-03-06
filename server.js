const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { scraper } = require("./scraper");
const { getBusinessByZipCode } = require("./searchByZipCodes");
const { getBusinessData } = require("./yelpBusinessLocation");
const { validateRawEmails } = require("./bulkEmailChecker");
let RateLimit = require("express-rate-limit");
const { queueRequests } = require("./utils");
const { scraPeYellowPages } = require("./scrapeYellowPages");
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;
mongoose.connect(
  "mongodb://root:root@mongo-companies.server.pkristijan.xyz:27017/",
  err => console.log("err", err)
);

const PORT = 4000;
/**
 * Get port from environment and store in Express.
 */
let port = normalizePort(process.env.PORT || PORT);
// let limiter = new RateLimit({
//   windowMs: 1 * 60 * 1000, // 1 minute
//   max: 1, // limit each IP to 1 requests per windowMs
//   delayMs: 0 // disable delaying - full speed until the max limit is reached
// });

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "5mb",
    parameterLimit: 100000
  })
);
app.use(
  bodyParser.json({
    limit: "5mb"
  })
);

// app.use(bodyParser.json());
//  apply to all requests
//app.use("/scrape", limiter);

let proxyIp = require("./myDataBase.json");

// app.post("/yellowPages", async (req, res) => {
//   const { vertical, location, count } = req.body;
//   let results = await scraPeYellowPages(vertical, location, count);

//   res.send({ msg: "success" });
// });


app.post("/scrape", async (req, res) => {
  const { query, vertical, location, scriptUrl, count } = req.body;

  if (!query || !vertical || !location || !scriptUrl) {
    return res.status(401).send({ msg: "Not enough parametars." });
  }

  let link = `http://www.bing.com/search?q=${query}&qs=n&first=0`;
  let startTime = new Date().getTime();
  req.startTime = startTime;
  queueRequests.push(startTime);
  console.log("Request Queue", startTime);
  let results = await scraper(
    link,
    [],
    location,
    vertical,
    count,
    scriptUrl,
    proxyIp.ip,
    startTime
  );
  // yelp business
  // let locationResults = getBusinessData(
  //   vertical,
  //   location,
  //   scriptUrl,
  //   startTime
  // );

  res.send({ msg: "success", link });
});

app.post("/bussines", async (req, res) => {
  const { location, scriptUrl, term } = req.body;

  if (!location || !scriptUrl || !term) {
    return res.status(401).send({ msg: "Not enough parametars." });
  }

  let locationResults = await getBusinessData(term, location, scriptUrl);

  res.send({ msg: "success", location, term });
});

app.post("/zipCodeSearch", async (req, res) => {
  const { city, country, vertical, scriptUrl } = req.body; // zipcode

  if (!city || !country || !vertical || !scriptUrl) {
    return res.status(401).send({ msg: "Not enough parametars." });
  }

  let zipCodesBussines = await getBusinessByZipCode(
    city,
    country,
    vertical,
    scriptUrl
  );

  res.send({ msg: "success", country, vertical });
});

app.post("/validatemails", async (req, res) => {
  let { rawEmails, scriptUrl } = req.body;
  console.log(rawEmails);
  validateRawEmails(scriptUrl, rawEmails);
  res.send({ msg: "success" });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
