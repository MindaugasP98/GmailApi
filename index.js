//node file reader
const fs = require("fs");
//readline module
const readline = require("readline");
//google api module
const { google } = require("googleapis");
const { oauth2 } = require("googleapis/build/src/apis/oauth2");
const { error } = require("console");
const { dlp } = require("googleapis/build/src/apis/dlp");

//scope which can be used
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
//token storing dir
const TOKEN_PATH = "token.json";
//read jsonString an put it in constant
const jsonString = fs.readFileSync("credentials.json", "utf-8");
//parse jsonString to objects and deconstruct and extract needed values
const { client_id, client_secret } = JSON.parse(jsonString).web;
//redirect when authenticated to my specified url
const redirect_uris = "http://localhost:8080";
//new client created by using GoogleAPiLibrary (clientid,secret and redirect uri passed)
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris
);
//retrieve token from the token path
const token = fs.readFileSync(TOKEN_PATH, "utf-8");
//if token exists set credentials of oauthclient from token
if (token) {
  oAuth2Client.setCredentials(JSON.parse(token));
  //check if token is not expiring, if expiring access refresh token and rewrite access token
  if (oAuth2Client.isTokenExpiring()) {
    oAuth2Client
      .refreshAccessToken()
      .then((newToken) => {
        oAuth2Client.setCredentials(newToken.credentials);
        fs.writeFile(
          TOKEN_PATH,
          JSON.stringify(newToken.credentials),
          (err) => {
            if (err) {
              console.error("Error storing refreshed token:", err);
            } else {
              console.log("Token refreshed successfully");
            }
          }
        );
        listEmails(oAuth2Client);
      })
      .catch((error) => {
        console.error("Error refreshing token:", error.message);
      });
  } else {
    // listEmails(oAuth2Client);
    showGmailProfile(oAuth2Client);
  }
} else {
  //create an authenticationURL using Google APILibrary
  const authURL = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this URL:", authURL);
  //read user Input for the authorization code by using readline module
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  //Create A way to input the auth code that was retrieved from auth URL
  rl.question("Enter the code from that page here:", (code) => {
    rl.close();

    //get token via auth code using google api library
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token:", err);

      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error("Error storing token:", err);
        console.log("Token stored to", TOKEN_PATH);
        listEmails(oAuth2Client);
      });
    });
  });
}
//function to list emails
function listEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  gmail.users.messages.list(
    {
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 5,
    },
    (err, res) => {
      if (err) return console.log("THE API returned an error:", err.message);

      const messages = res.data.messages;
      if (messages.length) {
        console.log("Emails:");

        messages.forEach((message) => {
          gmail.users.messages.get(
            { userId: "me", id: message.id },
            (err, emailDetails) => {
              if (err)
                console.error("Some errors while fetching mail:", err.message);

              console.log(`- ${message.id}`);
              const email = emailDetails.data;

              console.log(`Subject: ${email.subject}`);
              console.log(`From ${email.body}`);
              console.log(`Snippet: ${email.snippet}`);
              console.log("------------------------------------");
            }
          );
        });
      } else {
        console.log("No emails found");
      }
    }
  );
}
//Check My Gmail Profile Data
function showGmailProfile(auth) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const userId = "me";
  console.log("We here");
  gmail.users.getProfile({ userId }, (err, res) => {
    if (err) {
      console.error("Error getting profile:", err.message);
      return;
    }
    const profile = res.data;
    console.log("Profile:", profile);
  });
}
