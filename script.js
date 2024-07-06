/*
 * Client-Side Mindmap Browser Tool
 *
 * https://sapphyra.neocities.org
 *
 * Copyright (C) 2024 sapphyra
 *

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const VERSION = '0.0.1';
const VERSION_DATE = '2024/06/26';

// Shortcut and Utility Functions
const $ = (selector) => document.querySelector(selector);
const $a = (selector) => document.querySelectorAll(selector);
const $n = (element) => document.createElement(element);

const $nsvg = (element) => document.createElementNS('http://www.w3.org/2000/svg', element);

const $defer = (func) => window.addEventListener("load", func);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const randint = (min, max) => min + Math.floor(Math.random() * (max - min));

// Constant values
const SCREEN_SCROLL_SPEED = 1.5;
const KEYBOARD_SHORTCUTS = [
    {
      name: 'Pan',
      command: 'Hold <span class="key">CTRL</span>, then click and drag',
      auto: false,
      action: function() {
        for (const key of Object.keys(Node.dict)) {
            let node = Node.dict[key];
            
            node.x += e.movementX * SCREEN_SCROLL_SPEED;
            node.y += e.movementY * SCREEN_SCROLL_SPEED;
            
            node.updateAllLines();
            
            if (node.root) {
                node.root.updateLine(node);
            }
        } 
      },
    },
    {
      name: 'New',
      key: 'n',
      meta: 'Alt',
      auto: true,
      action: function() {
        newDocument();
      },
    },
    {
      name: 'Save',
      key: 's',
      meta: 'Control',
      auto: true,
      action: function() {
        saveNodeData();
      },
    },
    {
      name: 'Import',
      key: 'F8',
      meta: 'None',
      auto: true,
      action: function() {
        $("#import").click(); 
      },
    },
    {
      name: 'Export',
      key: 'F9',
      meta: 'None',
      auto: true,
      action: function() {
        download('tree.json', getNodeJSONData());
      },
    },
    ];

// Global Variables
let root_node;

let mouse_x, mouse_y;

// Class Definitions

class Node {
    static selected_node;
    static dict = {};
    static used_ids = [];
    
    static generateId() {
	let len = 10;
	
	let id = "";
	let letters = [];

	// Fill letters[] with all capital letters A-Z
	for (let i = 65; i < 91; i++) {
		letters.push(String.fromCharCode(i));
	}

	for (var i = 0; i < len; i++) {
	    let new_char;
	    if (randint(0, 10) <= 5) new_char = randint(0, 9);
	    else new_char = letters[randint(0, letters.length - 1)];
	    
	    //console.log(new_char);
	    id += `${new_char}`;
	}
	
	if (Node.used_ids.includes(id)) return Node.generateId();
	return id;
        
    }
    
    static clear() {
        for (const key of Object.keys(Node.dict)) {
            let node = Node.dict[key];
            
            node.node.parentNode.removeChild(node.node);
        }
        Node.dict = {};
    }
    root;
    children = [];
    
    node;
    #name_element;
    #content_element;
    
    #name;
    #content;
    
    #selected = false;
    
    #svg_lines = {};
    
    #x;
    #y;
    
    #id;
    
    constructor(id, parent, name, text="") {
        this.#id = id;
        Node.used_ids.push(id);
        Node.dict[id] = this;
        this.#name = name;
        this.root = parent;
        this.node = $n("div");
        this.#content = text;
        
        this.node.className = "node";
        this.node.setAttribute('data-nodeid', id);
        this.#name_element = $n("span");
        this.#name_element.className = "nheader";
        this.#name_element.innerText = this.#name;
        
        this.#content_element = $n("p");
        this.#content_element.innerText = this.#content;
        //this.node.innerHTML = `<span class="nheader">${this.#name}</span>${this.#content}`;
        
        this.node.appendChild(this.#name_element);
        this.node.appendChild(this.#content_element);
        
        this.node.addEventListener("click", (e) => this.handleNodeClick(e));
        
        this.node.addEventListener("mousedown", (e) => this.startDrag(e));
        this.node.addEventListener("mouseup", (e) => this.endDrag(e));
        
        if (parent) {
            let spacing = 30;
            this.x = parent.x;
            this.y = parent.y + parent.node.offsetHeight + spacing;
        }
        else {
            this.x = this.node.clientLeft;
            this.y = this.node.clientTop;
        }
    }
    
    get id() { return this.#id; }
    
    get x() {return this.#x;}
    get y() {return this.#y;}
    
    set x(value) {
        this.#x = value;
        this.node.style.left = `${value}px`;
    }
    
    set y(value) {
        this.#y = value;
        this.node.style.top = `${value}px`;
    }
    
    get selected() {
        return this.#selected;
    }
    
    set selected(value) {
        this.#selected = value;
        if (value == true) {
            this.node.className = "node selected";
        }
        else {
            this.node.className = "node";
        }
        
        if (value == true) {
            if (Node.selected_node && Node.selected_node != this) Node.selected_node.selected = false;
            Node.selected_node = this;
            
            $("#head_edit").value = this.#name;
            $("#head_edit").disabled = false;
            
            $("#text_edit").value = this.#content;
            $("#text_edit").disabled = false;
            
            $("#add_button").disabled = false;
            $("#del_button").disabled = false;
        }
        else {
            Node.selected_node = null;
            
            $("#head_edit").value = "";
            $("#head_edit").disabled = true;
            
            $("#text_edit").value = "";
            $("#text_edit").disabled = true;
            
            $("#add_button").disabled = true;
            $("#del_button").disabled = true;
        }
    }
    
    get name() {
        return this.#name;
    }
    
    set name(value) {
        this.#name = value;
        this.#name_element.innerText = value;
    }
    
    get content() {
        return this.#content;
    }
    
    set content(value) {
        this.#content = value;
        this.#content_element.innerText = value;
    }
    
    addChild(child) {
        if (!this.node.parentNode) return;
        this.node.parentNode.appendChild(child.node);
        this.children.push(child);
        
        child.root = this;
        
        let line = addLine(this.x + Math.floor(this.node.clientWidth / 2), this.y + Math.floor(this.node.clientHeight / 2), 
            child.x + Math.floor(child.node.clientWidth / 2), child.y + Math.floor(child.node.clientHeight / 2));
        
        this.#svg_lines[child.id] = line;
    }
    
    updateLine(child) {
        if (child == undefined || !Object.hasOwn(child, 'root')) {
            console.log("error: specificed child does not exist or is not a Node object.", child);
            return;
        }
        let line = this.#svg_lines[child.id];
        
        let x1, x2, y1, y2;
        
        x1 = this.x + Math.floor(this.node.clientWidth / 2);
        x2 = child.x + Math.floor(child.node.clientWidth / 2);
        y1 = this.y + Math.floor(this.node.clientHeight / 2);
        y2 = child.y + Math.floor(child.node.clientHeight / 2);
        
        line.setAttribute("x1", x1);
        line.setAttribute("x2", x2);
        line.setAttribute("y1", y1);
        line.setAttribute("y2", y2);
    }
    
    updateAllLines() {
        for (const key of Object.keys(this.#svg_lines)) {
            this.updateLine(Node.dict[key]);
        }
    }
    
    removeChild(child) {
        if (!this.node.parentNode) return;
        let idx = this.children.indexOf(child);
        if (idx > -1) { // if child is found in array
            this.node.parentNode.removeChild(child.node);
            this.children.splice(idx, 1);
        }
        
        $('#lineSVG').removeChild(this.#svg_lines[child.id]);
        
        delete this.#svg_lines[child.id];
        
        delete Node.dict[child.id];
    }
    
    handleNodeClick(e) {
        this.selected = true;
        
        e.stopPropagation();
    }
    
    startDrag(e) {
        this.node.setAttribute('data-drag', 'true');
        e.stopPropagation();
    }
    
    endDrag(e) {
        this.node.setAttribute('data-drag', 'false');
    }
    
    destroy() {
        if (this.root) this.root.removeChild(this);
    }
    
    getJSONData() {
        return {
            id: this.#id,
            name: this.#name,
            content: this.#content,
            x: this.#x,
            y: this.#y,
            children: this.children.map((child) => child.id),
        }
    }
}

// Function Definitions

function addLine(x1, y1, x2, y2) {
    let svg = $("#lineSVG");
    
    let line = $nsvg("line");
    
    line.setAttribute("x1", x1);
    line.setAttribute("x2", x2);
    line.setAttribute("y1", y1);
    line.setAttribute("y2", y2);
    
    line.setAttribute("stroke", "white");
    
    svg.appendChild(line);
    
    return line;
}

function generateCommandDescription(meta, key) {
	if (meta == "Control") meta = "CTRL";
	if (meta == "None") meta = undefined;

	if (!meta) return `<span class="key">${key.toUpperCase()}</span>`;
	return `<span class="key">${meta.toUpperCase()}</span> 
		+ <span class="key">${key.toUpperCase()}</span>`;
}

function saveNodeData() {
    let data = getNodeJSONData();
    
    localStorage.setItem('data', data);
}

function loadNodeData(data) {
    let json = JSON.parse(data);
    
    let nodeDict = {};
    
    // initialize nodes
    for (const entry of json) {
        let new_node = new Node(entry.id, null, entry.name);
        new_node.content = entry.content;
        new_node.x = entry.x;
        new_node.y = entry.y;
        nodeDict[entry.id] = new_node;
        
        $("main").appendChild(new_node.node);
    }
    
    // setup node tree
    for (const entry of json) {
        let node = nodeDict[entry.id];
        
        for (const childID of entry.children) {
            node.addChild(Node.dict[childID]);
        }
    }
}

function loadNodeDataFromFile() {
    let imp = $("#import");
    if (imp.value == "") return;
    
    Node.clear();
    
    $("#lineSVG").innerHTML = "";

    let files = imp.files;

    let reader = new FileReader();

    reader.readAsText(files[0]);

    function safeLoad(e) {
        try {
            loadNodeData(reader.result);
        }
        catch {
            console.log("Import failed.");
        }
        finally {
            reader.removeEventListener("load", safeLoad);
        }
    }

    reader.addEventListener("load", safeLoad);
    
    imp.value = "";
}

function newDocument() {
    if (confirm("Warning: all unsaved progress will be lost.  Continue?")) {
       Node.clear();
       $("#lineSVG").innerHTML = "";
       addRootNode();
   }
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function getNodeJSONData() {
    let data = [];
    
    for (const key of Object.keys(Node.dict)) {
        let node = Node.dict[key];
        
        data.push(node.getJSONData());
    }
    
    return JSON.stringify(data);
}

function addRootNode() {
    root_node = new Node("root", null, "root");
    $("main").appendChild(root_node.node);
    
    root_node.x = Math.floor(window.innerWidth / 2);
    root_node.y = Math.floor(window.innerHeight / 2);
}

function showKeyboardShortcuts() {
    let dialog = $("#keyboard_shortcuts");
    
    if (!dialog) {
        dialog = $n("dialog");
        dialog.id = "keyboard_shortcuts";   
        
        let content = $n('div');
    
        /*
        content.innerHTML = `<dl>
        <dt>Pan</dt><dd>Hold down <span class="key">CTRL</span>, then click and drag the mouse to scroll the view.</dd>
        </dl>`;
        */
        
        let titlebar = $n('span');
        
        titlebar.innerText = `Keyboard Shortcuts`;
        titlebar.className = 'heading';
        
        let shortcutList = $n('dl');
        
        for (const entry of KEYBOARD_SHORTCUTS) {
            let title = $n('dt');
            title.innerText = entry.name;
            
            let desc = $n('dd');
            
	    if (entry.auto) {
		desc.innerHTML = generateCommandDescription(entry.meta, entry.key);
	    }
	    else {
	        desc.innerHTML = entry.command;
		}

            shortcutList.appendChild(title);
            shortcutList.appendChild(desc);
        }
        
        let closeButton = $n('button');
        
        closeButton.innerText = "Close";
        
        closeButton.addEventListener('click', (e) => {
            $('#keyboard_shortcuts').close();
        });
        
        content.appendChild(titlebar);
        content.appendChild(shortcutList);
        content.appendChild(closeButton);
        dialog.appendChild(content);
        
        $("body").appendChild(dialog);
    }
    
    dialog.show();
}

function setupInspector() {
    let inspector = $("#inspector");
    
    let addButton = $n("button");
    
    addButton.innerText = "Add";
    addButton.id = "add_button";
    
    addButton.disabled = true;
    
    addButton.addEventListener('click', (e) => {
        Node.selected_node.addChild(new Node(`${Node.generateId()}`, Node.selected_node, ""));
    });
    
    let delButton = $n('button');
    
    delButton.innerText = "Delete";
    delButton.id = "del_button";
    
    delButton.disabled = true;
    
    delButton.addEventListener('click', (e) => {
        Node.selected_node.destroy();
        Node.selected_node = null;
            
        $("#head_edit").value = "";
        $("#head_edit").disabled = true;
        
        $("#text_edit").value = "";
        $("#text_edit").disabled = true;
        
        $("#add_button").disabled = true;
        $("#del_button").disabled = true;
    });
    
    let headerEditor = $n("input");
    headerEditor.id = "head_edit";
    headerEditor.disabled = true;
    headerEditor.setAttribute('type', 'text');
    
    headerEditor.addEventListener('change', function (e) {
       Node.selected_node.name = this.value;
    });
    
    let contentEditor = $n("textarea");
    contentEditor.id = "text_edit";
    contentEditor.disabled = true;
    
    contentEditor.addEventListener('change', function (e) {
        Node.selected_node.content = this.value;
    })
    
    inspector.appendChild(headerEditor);
    inspector.appendChild(contentEditor);
    inspector.appendChild(addButton);
    inspector.appendChild(delButton);
    
    inspector.addEventListener('click', (e) => {e.stopPropagation();});
}

function setupToolbar() {
    let toolbar = $("#toolbar");
    
    let newButton = $n('button');
    
    newButton.innerText = "New";
    
    newButton.addEventListener('click', (e) => {
       newDocument();
    });
    
    let saveButton = $n("button");
    
    saveButton.innerText = "Save";
    
    saveButton.addEventListener('click', (e) => {
        saveNodeData();
    });
    
    let importButton = $n('button');
    
    importButton.innerText = "Import";
    
    importButton.addEventListener('click', (e) => {
       $("#import").click(); 
    });
    
    let exportButton = $n('button');
    
    exportButton.innerText = 'Export';
    
    exportButton.addEventListener('click', (e) => {
       download('tree.json', getNodeJSONData());
    });
    
    toolbar.appendChild(newButton);
    toolbar.appendChild(saveButton);
    toolbar.appendChild(importButton);
    toolbar.appendChild(exportButton);
}

function setupInfobar() {
    let infobar = $("#infobar");
    
    infobar.innerHTML = `<i>Version ${VERSION}</i><br><a href="#" onclick="showKeyboardShortcuts();">Keyboard shortcuts</a>`;
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (e.key == 'Control') {
            $('body').setAttribute('data-cursor-state', 'move');
        }
        
        handleKeyboardShortcuts(e);
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key == 'Control') {
            $('body').setAttribute('data-cursor-state', 'default');
        }
    });
    
    
    window.addEventListener('mousemove', (e) => {
        if (e.ctrlKey && e.buttons == 1) {
            for (const key of Object.keys(Node.dict)) {
                let node = Node.dict[key];
                
                node.x += e.movementX * SCREEN_SCROLL_SPEED;
                node.y += e.movementY * SCREEN_SCROLL_SPEED;
                
                node.updateAllLines();
                
                if (node.root) {
                    node.root.updateLine(node);
                }
            }    
            return;
        }
        
        mouse_x = e.x;
        mouse_y = e.y;
        let drag_elements = $a(`*[data-drag="true"]`);
        
        if (!drag_elements || drag_elements.length == 0) return;
        
        for (element of drag_elements) {
            if (element.className.includes("node")) {
                let node = Node.dict[element.getAttribute('data-nodeid')];
            
                node.x = /*clamp(*/e.clientX - Math.floor(element.offsetWidth / 2);//, 0, window.innerWidth - element.offsetWidth);
                node.y = /*clamp(*/e.clientY - Math.floor(element.offsetHeight / 2);//, 0, window.innerHeight - element.offsetHeight);
                
                node.updateAllLines();
                
                if (node.root) {
                    node.root.updateLine(node);
                }
            }
            else {
                element.style.left = `${clamp(e.clientX - Math.floor(element.offsetWidth / 2), 0, window.innerWidth - element.offsetWidth)}px`;
                element.style.top = `${clamp(e.clientY - Math.floor(element.offsetHeight / 2), 0, window.innerHeight - element.offsetHeight)}px`;
            }
            
        }
    });
    
    addEventListener('pointerup', (e) => {
        let drag_elements = $a(`*[data-drag="true"]`);
        
        if (!drag_elements || drag_elements.length == 0) return;
        
        for (element of drag_elements) {
            element.setAttribute('data-drag', 'false');
        }
    });
    
    document.addEventListener('click', (e) => {
       for (const element of $a(".node")) {
           let node = Node.dict[element.getAttribute('data-nodeid')];
           if(!node) continue;
           node.selected = false;
       }
    });
    
    window.addEventListener('resize', (e) => {
       $("#lineSVG").setAttribute('viewBox', `0 0 ${$("html").clientWidth} ${$("html").clientHeight}`);
       
       /*
       for (const element of $a('.node')) {
           let node = Node.dict[element.getAttribute('data-nodeid')];
           node.x = clamp(node.x, 0, $("html").clientWidth - element.offsetWidth);
           node.y = clamp(node.y, 0, $("html").clientHeight - element.offsetHeight);
           node.updateAllLines();
           if (node.root) {
               node.root.updateLine(node);
           }
       }
       */
       
       for (const element of $a('.drag')) {
           element.style.left = `${clamp(parseInt(element.style.left), 0, $("html").clientWidth - element.offsetWidth)}px`;
           element.style.top = `${clamp(parseInt(element.style.top), 0, $("html").clientHeight - element.offsetHeight)}px`;
       }
    });
    
    let draggables = $a(".drag");
    
    for (const element of draggables) {
        element.addEventListener('mousedown', function (e) {this.setAttribute('data-drag', 'true');});
    }
    
    function handleKeyboardShortcuts(e) {
        for (const entry of KEYBOARD_SHORTCUTS) {
            if (!entry.auto) continue;
            
            if (e.key != entry.key) continue;
            if (entry.meta == 'Control' && !e.ctrlKey) continue;
            if (entry.meta == 'Alt' && !e.altKey) continue;
            
            entry.action();
            e.preventDefault();
            e.stopPropagation();
        }
    }
}

function setupLineSVG() {
    let svg = $nsvg("svg");
    
    svg.id = "lineSVG";
    
    svg.setAttribute('viewBox', `0 0 ${$("html").clientWidth} ${$("html").clientHeight}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    svg.style.position = 'absolute';
    svg.style.top = `0px`;
    svg.style.left = `0px`;
    
    svg.addEventListener('click', (e) => {e.preventDefault();});
    
    
    $("main").before(svg);
}

function init() {
    
    setupInspector();
    
    setupToolbar();
    
    setupInfobar();
    
    setupEventListeners();
    
    setupLineSVG();
    
    if (localStorage.getItem('data')) {
        try {
            loadNodeData(localStorage.getItem('data'));
        }
        catch {
            console.log("loading failed");
            
            addRootNode();
        }
    }
    else {
        addRootNode();
    }
    
}

// Execution

$defer(init);
