const mongoose = require("mongoose");
const company = require("./mongoDBController");
mongoose.Promise = global.Promise;
mongoose.connect(
  "mongodb://root:root@mongo-companies.server.pkristijan.xyz:27017/",
  err => console.log(err)
);
const { postDataToAppsScript } = require("../utils");
var companiesModel = require("./mongoDBModel");

async function searchFromDB(firstName) {
  console.log("firstName", firstName);
  return companiesModel
    .findOne({ firstName }, "name occupation", function(err, id) {
      if (err) return err;
      console.log("id", id);
      if (id !== null) {
        console.log("in if");
        return companiesModel
          .findById(id, function(err, person) {
            if (err) console.log(err);
            console.log("person", person);
            return [person];
          })
          .then(resp2 => {
            console.log("resp2", resp2);
          });
      } else {
        console.log("in else");
        return [];
      }
    })
    .then(resp => {
      if (resp !== null) {
        return resp;
      } else {
        return [];
      }
      console.log("resp", resp);
    });
}

module.exports.searchFromDB = searchFromDB;

// searchFromDB("Franklin");

//"Damon Gross - COO - Hyde Park Jewelers and"
// company.findSimilar("Damon", "Gross").then(resp => console.log(resp));

// company
//   .findByUserName("/Franklin/", "/Barbecue/", "Location: Austin, Texas")
//   .then(resp => console.log("resp from db", resp));

// company.show();

async function filterDataFromDbAndPostToScript(
  firstname,
  lastname,
  companyInfoName,
  scriptUrl
) {
  let dbCompanyArr = [];
  company
    .findByUserAndCompany(firstname, lastname, companyInfoName)
    .then(resp => {
      resp.map(el => {
        dbCompanyArr.push([
          el.companyName,
          el.description,
          el.address,
          el.city,
          el.country,
          el.website,
          el.firstName,
          el.lastName,
          el.email
        ]);
      });
      console.log(dbCompanyArr);
      postDataToAppsScript(scriptUrl, dbCompanyArr, "databaseRes");
    })
    .catch(err => []);
}
// filterDataFromDbAndPostToScript("Tony", "Sheppard", "Walsh, Sheppard");
