Module.register("MMM-MicrosoftToDo",{

    defaults: {
        clientSecret: '',
        refreshToken: '',
        clientId: '',
        updateInterval: 20,
        listName: 'Tasks', // optional parameter: default value is the "Tasks" list
        showCheckbox: true, // optional parameter: default value is true and will show a checkbox before each todo list item
        hideIfEmpty: false, // optional parameter: default value is false and will show the module also when the todo list is empty
        maxWidth: 450, // optional parameter: max width in pixel, default value is 450
        itemLimit: 200 // optional parameter: limit on the number of items to show from the list, default value is 200

    },

    getStyles: function () {
        return [this.file('todos.css')];
    },

    start: function() {

        this.tasks = [ { subject: this.translate("LOADING_ENTRIES") } ];

        // in case there are multiple instances of this module, ensure the responses from node_helper are mapped to the correct module
        this.config.id = this.identifier;

        this.sendSocketNotification("FETCH_TODO_DATA", this.config);

        var self = this;
        this.addListeners();
        /*setInterval(() => {
            self.sendSocketNotification("FETCH_TODO_DATA", self.config);
        }, this.config.updateInterval * 1000);*/
    },

    getTranslations: function() {
        return {
            en: "translations/en.js",
            de: "translations/de.js"
        };
    },

    addListeners: function() {
        document.addEventListener("click", event => {
            if (!event.target.matches('.todo-titleBtn')) {
                var dropDown = document.getElementById("todo-dropItems");
                if (dropDown.classList.contains('show')) {
                    dropDown.classList.remove('show');
                }
            }
            if (event.target.matches('.close')) {
                var divToClose = event.target.parentElement;
                divToClose.style.display = "none";
            }
            if (event.target.matches('.todo-task')) {
                event.target.classList.toggle('checked');
            }
        });
    },

    getDom: function() {

        var todoContainer = document.createElement("div");
        todoContainer.className = "todo-container";

        if (this.lists && this.tasks) {
            var listHeader = document.createElement("div");
            var dropTitle = this.createDropDown();
            var addButton = document.createElement("span");
            addButton.className = "todo-addBtn fas fa-plus-circle";
            dropTitle.appendChild(addButton);
            listHeader.appendChild(dropTitle);
            todoContainer.appendChild(listHeader);
        }

        // LIST

        var list = document.createElement("div");
        list.className = "todo-list small";
        for (var i = 0; i < this.tasks.length; i++) {
            console.log(this.tasks[i].status);
            if (this.tasks[i].status != "completed") {
                list.insertAdjacentHTML('beforeend', `
                        <label class="todo-task">${this.tasks[i].subject}
                            <input class="taskbox" type="checkbox"/>
                            <span class="pseudobox"></span>
                            <button class="delete-todo js-delete-todo">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </label>

                `);
            }
        }

        todoContainer.appendChild(list);

        return todoContainer;
    },

    // Create a new list item when clicking on the "Add" button
    /*newElement: function() {
        var li = document.createElement("li");
        var inputValue = document.getElementById("myInput").value;
        var t = document.createTextNode(inputValue);
        li.appendChild(t);
        if (inputValue === '') {
            alert("You must write something!");
        } else {
            document.getElementById("").appendChild(li);
        }
        //document.getElementById("myInput").value = "";

        var span = document.createElement("span");
        var txt = document.createTextNode("\u00D7");
        span.className = "todo-close";
        span.appendChild(txt);
        li.appendChild(span);

        for (i = 0; i < close.length; i++) {
            close[i].onclick = function() {
                var div = this.parentElement;
                div.style.display = "none";
            }
        }
    },*/

    createDropDown: function() {
        var drop = document.createElement("div");
        drop.className = "todo-dropdown-title";
        var titleBtn = document.createElement("input");
        titleBtn.setAttribute("type", "button");
        titleBtn.className = "todo-titleBtn bright";
        titleBtn.value = this.config.listName +  " \u2BC6";
        titleBtn.addEventListener("click", function () {
            document.getElementById("todo-dropItems").classList.toggle("show");
        });
        drop.appendChild(titleBtn);
        var dropList = document.createElement("div");
        dropList.id = "todo-dropList";
        var dropItems = document.createElement("div");
        dropItems.id = "todo-dropItems";
        for (let i = 0; i < this.lists.length; i++) {
            var dropItem = document.createElement("div");
            dropItem.className = "todo-dropItem";
            dropItem.innerHTML = this.lists[i].name;
            var self = this;
            dropItem.addEventListener("click", function () {
                clickedList = this.innerHTML;
                console.log("List clicked: " + clickedList);
                self.config.listName = clickedList;
                if (self.lists[i].hasOwnProperty("id")) {
                    self.sendSocketNotification("GET_TASKS", self.lists[i].id);
                }
            });
            dropItems.appendChild(dropItem);
        }
        dropList.appendChild(dropItems);
        drop.appendChild(dropList);
        return drop;
    },



    socketNotificationReceived: function (notification, payload) {
        if (notification === "TASKS") {
            this.tasks = payload;

            // check if module should be hidden according to list size and the module's configuration
            if (this.config.hideIfEmpty) {
                if(this.tasks.length > 0 && this.hidden){
                    this.show();
                } else {
                    if(!this.hidden) {
                        console.log(this.name + ' hiding module according to \'hideIfEmpty\' configuration, since there are no tasks present in the list.');
                        this.hide();
                    }
                }
            }
            this.updateDom();
        } else if (notification === "LISTS") {
            this.lists = payload;
            this.updateDom();
        }
    },

    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ":", JSON.stringify(msg));
        }
    },
});
