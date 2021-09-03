const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { mainModule } = require('process');
require('dotenv').config()

const epic_url = process.env.EPIC_URL;
const play_url = process.env.PLAY_URL;
const discord_webhook = process.env.DISCORD_WEBHOOK;
const app_wait = process.env.APP_WAIT;

//const epic_url = "https://www.epicgames.com/store/en-US/";
//const play_url = "https://playground.alreadydev.com/epic/"
//const app_wait = 300;

async function generateHash(data) {
  return crypto.createHash('md5').update(data).digest("hex");
}

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

async function formatPost(data) {
    let formattedData = "__Free Now:__\n"; //"--- Hey!.. Free Games! ---\n";
    formattedData += data;
    formattedData += "\n\n__Go get em:__ \n" + epic_url;
    console.log(formattedData);
    await postToDiscord(formattedData);
}

async function postToDiscord(data) {
  var data = JSON.stringify({
    "content": "", "embeds" : [{"title": "Hey Guys! \nFree Games on the Epic Games Store!", "description": data}] });

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
  if (latestHash != savedHash && savedHash != "pause"){
    return false
  }
  return true;
}

async function run () {
  const browser = await puppeteer.launch({args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]});
  const page = await browser.newPage();
  await page.goto(epic_url);
  const data = await page.evaluate(() => document.querySelector('[data-component="DiscoverContainerHighlighted"]').innerText);

  if(data.includes("DiscoverContainerHighlighted")){
    console.log("FOUND")
  }  

  let newData = data.replace("Free Games\n", "");
  newData = newData.replace("VIEW MORE\n", "");
  newData = newData.replace("FREE NOW\n", "");
  newData = newData.replace("COMING SOON\n", "\n__Coming Soon:__\n");

  let latestHash = await generateHash(newData);
  let savedHash = await getSavedHash();
  let match = await compareHashes(latestHash, savedHash)

  console.log("Latest Hash: " + latestHash);
  console.log("Saved Hash: " + savedHash);
  console.log("Matched?: " + match);

  if(!match){
    await formatPost(newData);
    await updateSavedHash(latestHash);
  }

  browser.close();
}

async function main(){
  await run();
  setTimeout(function(){ main();  }, app_wait);
}

// Do Stuff
main();