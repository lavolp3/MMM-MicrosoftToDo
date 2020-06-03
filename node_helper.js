/*
  Node Helper module for MMM-MicrosoftToDo

  Purpose: Microsoft's OAutht 2.0 Token API endpoint does not support CORS,
  therefore we cannot make AJAX calls from the browser without disabling
  webSecurity in Electron.
*/
var NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({

    start: function () {
        console.log(this.name + " helper started ...");
    },


    socketNotificationReceived: function (notification, payload) {
        console.log(this.name + " received module notification: " + notification);
        var self = this;
        if (notification === "FETCH_TODO_DATA") {
            this.config = payload;
            this.getToken()
                .then(token => {
                    self.getLists(token);
                })
                .catch(error => {
                    console.error(error);
                });
        } else if (notification === "GET_TASKS") {
            this.getToken()
                .then(token => {
                    self.getTasks(payload, token);
                })
                .catch(error => {
                    console.error(error);
                });;
        } else {
            console.log(this.name + " - Did not process event: " + notification);
        }
    },


    getToken: function() {
        // copy context to be available inside callbacks
        var self = this;

        // get access token
        return new Promise(function(resolve, reject) {
            var tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
            var refreshToken = self.config.refreshToken;
            var data = {
                client_id: self.config.clientId,
                ressource: "https://graph.microsoft.com",
                scope: "offline_access user.read tasks.read",
                refresh_token: refreshToken,
                grant_type: "refresh_token",
                client_secret: self.config.clientSecret
            };
            console.log(self.name + " - Requesting Access Token...");
            request.post(
                {
                    url: tokenUrl,
                    form: data
                },
                function (error, response, body) {
                    if (error) {
                        console.log(self.name + " - Error while requesting access token: ");
                        console.log(error);
                        self.sendSocketNotification("FETCH_INFO_ERROR", error);
                        reject(error);
                    } else {
                        console.log(self.name + " - Successfully requested access token");
                        var accessTokenJson = JSON.parse(body);
                        var accessToken = accessTokenJson.access_token;
                        console.log(accessToken);
                        resolve(accessToken);
                    }
                }
            );
        });
    },


    getLists: function(accessToken) {
        var self = this;

        console.log(this.name + " - Requesting Todo Lists...");
        var taskFoldersUrl = "https://graph.microsoft.com/beta/me/outlook/taskFolders/?$top=200";
        request.get({
            url: taskFoldersUrl,
            headers: { 'Authorization': 'Bearer ' + accessToken }
        }, function (error, response, body) {
            if (error) {
                console.log(this.name + " - Error while requesting task lists:");
                console.log(error);
                self.sendSocketNotification("FETCH_INFO_ERROR", error);
                return;
            } else {
                // parse response from Microsoft
                var lists = JSON.parse(body);
                //console.log(JSON.stringify(lists));

                for (var i = 0; i < lists.value.length; i++) {
                    console.log("List: " + lists.value[i].name);
                }

                // set listID to default task list "Tasks"
                var listId = "";
                lists.value.forEach(element => element.isDefaultFolder ? listId = element.id : '' );
                console.log("Default ListId: "+listId);

                self.sendSocketNotification("LISTS", lists.value);

                // based on new configuration data (listId), get tasks
                self.getTasks(listId, accessToken);
            }
        });
    },


    getTasks: function(listId, accessToken) {
        console.log(this.name + " - Getting ToDo Tasks for list "+listId);
        //var listUrl = "https://graph.microsoft.com/beta/me/outlook/taskFolders/" + listId + "/tasks?$select=subject,status&$top=" + this.config.itemLimit + "&$filter=status%20ne%20%27completed%27"
        var listUrl = "https://graph.microsoft.com/beta/me/outlook/taskFolders/" + listId + "/tasks?$top=" + this.config.itemLimit;
        var self = this;
        request.get({
            url: listUrl,
            headers: {
               'Authorization': 'Bearer ' + accessToken
            }
        }, function (error, response, body) {

            if (error || body.error) {
                console.log(self.name + " - Error while requesting tasks: ");
                console.log(error);
                self.sendSocketNotification("FETCH_INFO_ERROR", error);
                return;
            } else {
                // send tasks to front-end
                var tasksJson = JSON.parse(body);
                for (var i = 0; i < tasksJson.value.length; i++) {
                    if (tasksJson.value[i].status != "completed") {
                        console.log(JSON.stringify(tasksJson.value[i]));
                    }
                }
                self.sendSocketNotification("TASKS", tasksJson.value);
            }
        });
    },


});
