/* 
Application: EpicReminderNode - index.js
Developer: Ron Egli - github.com/smugzombie
Purpose: This tool scrapes the EpicGames store for free games, then posts it to a discord channel for monitoring
*/

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const axios = require('axios');
// Load in environment variables
require('dotenv').config()
const epic_url = process.env.EPIC_URL;
const play_url = process.env.PLAY_URL;
const discord_webhook = process.env.DISCORD_WEBHOOK;
const app_wait = process.env.APP_WAIT;
const version = "1.0.1";
const debug = true;

// Generate a md5 hash of the data to be validated in the future
async function generateHash(data) {
  return crypto.createHash('md5').update(data).digest("hex");
}

// Get the hash we have saved from the last run
async function getSavedHash() {
  var config = {
    method: 'get',
    url: play_url,
    headers: { }
  };
  return await axios(config)
  .then(function (response) {
    return response.data;
  })
  .catch(function (error) {
    console.log(error);
  });
}

// Update the webserver with the new hash
async function updateSavedHash(hash) {
  var config = {
    method: 'get',
    url: play_url + "?hash=" +  hash ,
    headers: { }
  };
  return await axios(config)
  .then(function (response) {
    return response.data;
  })
  .catch(function (error) {
    console.log(error);
  });
}

// Format the incoming data to be posted into discord, then send it to Discord
async function formatPost(data) {
    let formattedData = "__Free Now:__\n"; //"--- Hey!.. Free Games! ---\n";
    formattedData += data;
    formattedData += "\n\n__Go get em:__ \n" + epic_url;
    // Debug
    // console.log(formattedData);
    await postToDiscord(formattedData);
}

// Post the formatted data to Discord
async function postToDiscord(data) {
  var data = JSON.stringify({
    "content": "", "embeds" : [{"title": "Hey Guys! \nFree Games on the Epic Games Store!", "description": data}] 
  });

  var config = {
    method: 'post',
    url: discord_webhook,
    headers: { 
      'Content-Type': 'application/json'
    },
    data : data
  };

  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
}

async function compareHashes(latestHash, savedHash) {
  // If the latest hash doesn't equal the current hash AND the current hash doesn't equal pause - No match found
  if (latestHash != savedHash && savedHash != "pause"){
    return false
  }
  // Otherwise we meet match condition
  return true;
}

// Returns a formatted timestamp
function getFormattedDate(){
  var d = new Date();
  d = d.getFullYear() + "-" + ('0' + (d.getMonth() + 1)).slice(-2) + "-" + ('0' + d.getDate()).slice(-2) + " " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);
  return d;
}

async function run () {
  console.log('Last Scrape Initiated: ' + getFormattedDate());
  // Launch the browser
  const browser = await puppeteer.launch({args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]});
  // Open a new tab
  const page = await browser.newPage();
  // Go to epic_url
  await page.goto(epic_url);
  // Wait for page to render, then search page for specific data component
  const data = await page.evaluate(() => document.querySelector('[data-component="DiscoverContainerHighlighted"]').innerText); 
  // Clean up the original data
  let newData = data.replace("Free Games\n", "").replace("VIEW MORE\n", "").replace("FREE NOW\n", "").replace("COMING SOON\n", "\n__Coming Soon:__\n");
  // Fetch and compare hashes
  let latestHash = await generateHash(newData);
  let savedHash = await getSavedHash();
  let match = await compareHashes(latestHash, savedHash)
  // Debug
  if(debug){
    console.log("Latest Hash: " + latestHash + "\nSaved Hash: " + savedHash + "\nMatched?: " + match);
  }
  // If the hashes don't match
  if(!match){
    // Format the post for discord, then send it
    await formatPost(newData);
    // Update the current saved hash
    await updateSavedHash(latestHash);
  }
  // Cleanup
  browser.close();
}

// Functionized to be able to be called after timeout
async function main(){
  // Perform the actual task
  await run();
  // In predefined amount of time, try again.
  setTimeout(function(){ main();  }, app_wait);
}

// Do Stuff
console.log(getFormattedDate() + ': Script Started (' + version + ') (Debug: ' + debug + ') ');
main();