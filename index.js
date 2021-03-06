const axios = require("axios");
const { scrapeEmailFromDomain } = require("./scrapeContactInfo");
const { emailPermutator } = require("./permutate");
const { getLocationYelp, getYelpData } = require("./yelpLocation");
const { searchYelpData } = require("./yelpCompanySearch");
const { searchPlaces, placeInfo } = require("./googlePlaceUtils");
const { getBusinessData } = require("./yelpBusinessLocation");
const Company = require("./mongooseDB/mongoDBController");
const { scraPeYellowPages } = require("./scrapeYellowPages");
const fs = require("fs");
const { regexSnippetYelpData } = require("./yelpDataFromSnippet");
const { getYelpInfo } = require("./scrapeBusinessDomain");
const { regexSnippet } = require("./utils");
const { searchFromDB } = require("./mongooseDB/mongoDB");

// const { fbEmails, fbPlaces } = require("./firebase");
const {
  postDataToAppsScript,
  removeElem,
  textDataToArray,
  emptyTextDataFile
} = require("./utils");
const { getEmailsFromToofr } = require("./getEmailsFromToofr");

const getMapsPlacesLocation = async (
  linkedinData,
  inputLocation,
  vertical,
  scriptUrl,
  userStartTime
) => {
  let placesArr = [];
  let emailLeads = [];
  let uncheckedData = [];

  for (let i = 0; i < linkedinData.length; i++) {
    let link = linkedinData[i];

    //  fbLinkedinUsers.push(link)
    let splitted = stripSpecalChar(link.name)
      .split(" ")
      .filter(item => item.length > 2);

    let location = link.location || `Location ${inputLocation}`;

    // console.log("LINKEDIN SNIPPET ", link.snippet);
    let snippetFromReg = regexSnippet(link.snippet);
    console.log("LOCATION", inputLocation);

    let companyFromDb = await searchFromDB(splitted[0]);

    console.log("COMPANY DB", companyFromDb);

    if (companyFromDb.length > 0) {
      console.log("COMPANY FROM DB", companyFromDb);
      let dbCompanyArr = [];
      companyFromDb.map(el => {
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
        // if(el.email == "" || el.website == ""){

        //   let yellowPagesData = await scraPeYellowPages(
        //     el.companyName,
        //     location,
        //     vertical
        //   );

        //   await postDataToAppsScript(scriptUrl, yellowPagesData, "yellopagedata");
        //   if (yellowPagesData == []) {
        //     let yelpData = await getYelpData(el.companyName);
        //     await postDataToAppsScript(scriptUrl, yelpArr, "yelpdata");
        //   }
        // }
      });
      console.log("dbCompanyarr", dbCompanyArr);
      postDataToAppsScript(scriptUrl, dbCompanyArr, "databaseRes");
    } else {
      let yelloPagesFromSnippet = await scraPeYellowPages(
        link.snippet,
        location,
        vertical
      );
      // console.log("yelloPagesFromSnippet", yelloPagesFromSnippet);
      let yellowPaArr = [];
      if (yelloPagesFromSnippet !== undefined) {
        yellowPaArr = [
          [
            yelloPagesFromSnippet.email,
            yelloPagesFromSnippet.companyInfo.title,
            yelloPagesFromSnippet.companyInfo.website,
            yelloPagesFromSnippet.companyInfo.link,
            vertical,
            location
            //JSON.stringify(yelloPagesFromSnippet.companyInfo)
          ]
        ];

        Company.updateOrInsertCompany(
          splitted[0],
          splitted[1],
          yelloPagesFromSnippet.companyInfo.title,
          location,
          yelloPagesFromSnippet.companyInfo.website,
          yelloPagesFromSnippet.email
        );

        console.log("YELLOW PAGES ARR", yellowPaArr);

        // fs.appendFile("yellowData.txt", yellowPaArr.join("\n") + "\n"); // write to spredsheet

        await postDataToAppsScript(scriptUrl, yellowPaArr, "yellopagedata");
      } else {
        let yelpDataFromSnippet = await regexSnippetYelpData(
          snippetFromReg,
          location
        );

        if (yelpDataFromSnippet != undefined) {
          // console.log("YELP RESULTS FROM SNIPPET", yelpDataFromSnippet);
          let yelpArr = [];
          let results = await getYelpInfo(yelpDataFromSnippet);
          // console.log("RESULTS FROM YELP", results);
          // fs.appendFile("yelpData.txt", JSON.stringify(results) + "\n"); // write to spredsheet
          if (results != undefined) {
            yelpArr = [
              [
                results.firstName,
                results.lastName,
                results.website,
                vertical,
                location
              ]
            ];
          }
          console.log("YELP ARR", yelpArr);
          Company.updateOrInsertCompany(
            results.firstName,
            results.lastName,
            location,
            results.website
          );

          await postDataToAppsScript(scriptUrl, yelpArr, "yelpdata");
        } else {
          uncheckedData.push(linkedinData[i]);
        }
      }
    }
  }

  // return;
  for (let i = 0; i < uncheckedData.length; i++) {
    let link = uncheckedData[i];

    //  fbLinkedinUsers.push(link)
    let splitted = stripSpecalChar(link.name)
      .split(" ")
      .filter(item => item.length > 2);
    let filteredName = (splitted[0] + " " + splitted[1]).replace(
      /[^\w\s]/gi,
      ""
    );

    let location = link.location || `Location ${inputLocation}`;

    let yelpAddress = await getLocationYelp(filteredName, location);
   console.log("Yelp Address", yelpAddress);

    let placeData;
    if (!yelpAddress) {
      placeData = await searchPlaces(
        "" + filteredName + ", " + vertical + ", " + location + ""
      );
      // console.log("Search Place ", placeData)
      placeData = placeData[0];
      // await getGooglePlaceInfo(
      //   "" + filteredName + ", " + vertical + ", " + location + "",
      //   "query",
      //   getGooglePlacesApiKeys()
      // );
    }

    if (!placeData) {
      if (!yelpAddress) continue;
      placeData = await searchPlaces(
        "" + filteredName + ", " + vertical + ", " + yelpAddress + ""
      );
      placeData = placeData[0];
      // placeData = await getGooglePlaceInfo(
      //   "" + filteredName + ", " + vertical + ", " + yelpAddress + "",
      //   "query",
      //   getGooglePlacesApiKeys()
      // );
      if (!placeData) continue;
      continue;
    }

    let placeIdInfo = await placeInfo(placeData.place_id);
    // console.log("place ID", placeIdInfo);
    // await getGooglePlaceInfo(
    //   placeData.placeId,
    //   "placeid",
    //   getGooglePlacesApiKeys()
    // );
    let { vicinity, name, website = "", rating = "" } = placeIdInfo;

    placesArr.push([
      name,
      splitted[0],
      splitted[1],
      link.link,
      vicinity,
      website,
      rating
    ]);

    let domain = website.match(".*://?([^/]+)")
      ? website.match(".*://?([^/]+)")[1]
      : `${filteredName.replace(" ", "")}.com`;

    let crawlEmail = await scrapeEmailFromDomain(website || domain);

    // console.log(
    //   "Firstname",
    //   splitted[0],
    //   "LastName",
    //   splitted[1],
    //   "Website",
    //   website,
    //   "Domain",
    //   domain
    // );

    let emailFromToof = await getEmailsFromToofr(
      splitted[0],
      splitted[1],
      website || domain
    );

    // console.log("EMAILS FROM TOOFR", emailFromToof);
    if (emailFromToof != []) {
      let emailsToofr = [];
      emailFromToof.forEach(el => {
        emailsToofr.push(el.email + " , " + " | " + el.confidence);
      });
    }

    //let firstEmail = crawlEmail.split(",")[0];

    console.log("EMAILS FROM TOOFR", emailsToofr);

    let emails = [
      ...[
        name,
        splitted[0],
        splitted[1],
        link.link,
        website,
        filteredName,
        emailsToofr.join(" ")
        //crawlEmail
      ]
      //...permutateEmails
    ];
    emailLeads.push(emails);
  }
  await postDataToAppsScript(scriptUrl, placesArr, "places");

  await postDataToAppsScript(scriptUrl, emailLeads, "emails");
  //startTime;
  // await getBusinessData(vertical, inputLocation, scriptUrl);
  let queueRequests = removeElem(userStartTime);
  let isItLastReq = queueRequests.length === 0;
  console.log("Is it last request? ", isItLastReq, queueRequests);
  if (isItLastReq) {
    let rawEmails = textDataToArray();
    //console.log(rawEmails);
    console.log("PROCESS FINISHED");
    // Remove File data before Validation
    //emptyTextDataFile();
    //validateRawEmails(scriptUrl, rawEmails);

    await postDataToAppsScript(
      "https://script.google.com/macros/s/AKfycbwvj6UAhPMaEPb3p-SshlFeJ_Z2jftVeSwh-K2-I9VG9aaCs0Qd/exec",
      textDataToArray().map(item => [item]),
      "verifiedEmails"
    );
  }
};

function stripSpecalChar(str) {
  return str.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, " ");
}

module.exports = {
  //postDataToAppsScript,
  getMapsPlacesLocation
};
