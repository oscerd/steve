// Function for fetching JSON from the REST API
function getJSON(theUrl, xstate, callback) {
	var xmlHttp = null;
	if (window.XMLHttpRequest) {
		xmlHttp = new XMLHttpRequest();
	} else {
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlHttp.open("GET", theUrl, true);
	xmlHttp.send(null);
	xmlHttp.onreadystatechange = function(state) {
		if (xmlHttp.readyState == 4 && xmlHttp.status && xmlHttp.status >= 200) {
			if (callback) {
				window.setTimeout(callback, 0.01, xmlHttp.status, (xmlHttp.responseText && xmlHttp.responseText.length > 1) ? JSON.parse(xmlHttp.responseText) : null, xstate);
			}
		}
	}
}


// Posting to the REST API, returns http code + JSON response
function postREST(url, json, oform, callback, xstate) {
    var form = new FormData(oform)
    var xmlHttp = null;
    if (window.XMLHttpRequest) {
	xmlHttp = new XMLHttpRequest();
    } else {
	xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    for (i in json) {
		if (json[i]) form.append(i, json[i])
    }
    
	var response = null
	var code = 500
	xmlHttp.onreadystatechange = function(state) {
		if (xmlHttp.readyState == 4 && xmlHttp.status && xmlHttp.status >= 200) {
			code = xmlHttp.status
			response = (xmlHttp.responseText && xmlHttp.responseText.length > 1) ? JSON.parse(xmlHttp.responseText) : null
			callback(code, response, xstate)
		}
	}
	xmlHttp.open("POST", url, false);
    xmlHttp.send(form);
}




// Election creation callback
function createElectionCallback(code, response) {
	if (code != 201) {
		alert(response.message)
	} else {
		location.href = "/admin/edit_election.html?" + response.id
	}
}

// Create a new election
function createElection() {
	
	// Fetch data
	var eid = document.getElementById('eid').value;
	var title = document.getElementById('title').value
	var starts = document.getElementById('starts').value
	var ends = document.getElementById('ends').value
	var owner = document.getElementById('owner').value
	var monitors = document.getElementById('monitors').value
	var open = document.getElementById('open').value
	
	
	// Validate data
	if (!eid || eid.length == 0) {
		eid = parseInt(Math.random()*987654321).toString(16).toLowerCase()
	}
	if (starts && starts.length == 0 | parseInt(starts) == 0) starts = null;
	if (ends && ends.length == 0 | parseInt(ends) == 0) ends = null;
	if (ends) {
		ends = parseInt($.datepicker.parseDate( "yy-mm-dd", ends).getTime()/1000)
	}
	if (starts) {
		starts = parseInt($.datepicker.parseDate( "yy-mm-dd", starts).getTime()/1000)
	}
	
	// Send request
	var code, response = postREST("/steve/admin/setup/" + eid, {
		owner: owner,
		title: title,
		monitors: monitors,
		starts: starts,
		ends: ends,
		open: open
		},
		undefined,
		createElectionCallback)	
}


// Election editing
function renderEditElection(code, response, election) {
	if (code == 200) {
		var c = response.base_data.closed ? " (<font color='red'>CLOSED!</font>)" : ""
		document.getElementById('title').innerHTML = "Edit election: " + response.base_data.title + " (#" + election  + ")" + c
		
		if (response.base_data.closed) {
			document.getElementById('closea').setAttribute("href", "javascript:void(location.href='reopen.html'+document.location.search);");
			document.getElementById('closex').innerHTML = "Reopen election"
			document.getElementById('closea').setAttribute("title", "Click to reopen this election")
		}
		var obj = document.getElementById('ballot')
		obj.innerHTML = "There are no issues in this election yet"
		var s = 0;
		if (response.issues && response.issues.length > 0) {
			obj.innerHTML = "";
		}
		for (i in response.issues) {
			var issue = response.issues[i]
			s++;
			var outer = document.createElement('li');
			// Set style
			outer.setAttribute("class", "issueListItem")
			
			var no = document.createElement('div');
			no.setAttribute("class", "issueNumber")
			no.innerHTML = (s)
			
			// Add issue
			var inner = document.createElement('span')
			inner.innerHTML = issue.id + ": " + issue.title;
			outer.appendChild(no)
			outer.appendChild(inner)
			outer.setAttribute("onclick", "location.href='edit_issue.html?" + election + "/" + issue.id + "';")
			obj.appendChild(outer)
		}
	} else {
		alert("Could not load election data: " + response.message)
	}
}

function loadElectionData(election) {
	election = election ? election : document.location.search.substr(1);
	getJSON("/steve/voter/view/" + election, election, renderEditElection)
}
function displayTally(code, response, issue) {
	var obj = document.getElementById('tally_' + issue)
	if (obj) {
		if (response.winners) {
			obj.innerHTML = "<i>(" + response.votes + " votes cast)</i>\n<ol>"
			for (i in response.winners) {
				var winner = response.winners[i]
				var winnerName = response.winnernames[i]
				obj.innerHTML += "<li>" + winner + ": " + winnerName + "</li>"
			}
			obj.innerHTML += "</ol>"
		} else if (response.yes && response.yes != undefined) {
			obj.innerHTML = "<i>(" + response.votes + " votes cast)</i>\n\n"
			obj.innerHTML += "<b>Yes:     </b>" + response.yes + "\n"
			obj.innerHTML += "<b>No:      </b>" + response.no + "\n"
			obj.innerHTML += "<b>Abstain: </b>" + response.abstain + "\n"
		} else {
			obj.innerHTML = "Unknonwn vote type or no votes cast yet"
		}
	}
}
function readTally(code, response, election) {
	var obj = document.getElementById('preloaderWrapper')
	obj.setAttribute("id", "contents")
	obj.innerHTML = ""
	if (code == 200) {
			for (i in response.issues) {
			var issue = response.issues[i]
			obj.innerHTML += "<h3>" + issue.title + ":</h3>"
			obj.innerHTML += "<pre id='tally_" + issue.id + "'>Loading results...</pre>"
			obj.innerHTML += "<hr/>"
			getJSON("/steve/admin/tally/" + election + "/" + issue.id, issue.id, displayTally)
		}
	} else {
		alert(response.message)
	}

}

function loadTally(election) {
	election = election ? election : document.location.search.substr(1);
	getJSON("/steve/admin/view/" + election, election, readTally)
}


function loadAdminElectionData(election) {
	election = election ? election : document.location.search.substr(1);
	getJSON("/steve/admin/view/" + election, election, renderEditElection)
}


function loadIssueAdmin() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	var issue = l[1]
	getJSON("/steve/admin/view/" + document.location.search.substr(1), issue, renderEditIssue)
}

function loadBasedataAdmin() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	getJSON("/steve/admin/view/" + document.location.search.substr(1), election, renderEditBasedata)
}



var edit_c = []
var edit_s = []
var edit_i = null

function keyvaluepair(name, text, type, value, locked, onedit) {
	var obj = document.createElement('div')
	obj.setAttribute("class", "keyvaluepair");
	var txt = document.createElement('div');
	txt.setAttribute("class", "keyfield")
	txt.innerHTML = text
	obj.appendChild(txt)
	if (type == "text") {
		var input = document.createElement('input')
		input.setAttribute("id", name)
		input.value = value
		input.style.minWidth = "300px"
		obj.appendChild(input)
		if (locked) {
			input.setAttribute("readonly", "true")
			input.setAttribute("disabled", "true")
			input.style.background = "#999"
		}
		if (onedit) {
			input.setAttribute("onchange", onedit)
		}
	} else if (type == "textarea") {
		var input = document.createElement('textarea')
		input.setAttribute("id", name)
		input.value = value
		input.style.minWidth = "600px"
		input.style.minHeight = "250px"
		if (onedit) {
			input.setAttribute("onchange", onedit)
		}
		obj.appendChild(input)
	}
	
	return obj
}

function keyvaluepairText(name, key, value) {
	var obj = document.createElement('div')
	obj.setAttribute("class", "keyvaluepair");
	var txt = document.createElement('div');
	txt.setAttribute("class", "keyfield")
	txt.innerHTML = key
	obj.appendChild(txt)
	var val = document.createElement('div')
	val.innerHTML = value
	obj.appendChild(val)
	
	return obj
}

function saveCallback(code, response, election) {
	if (code == 200) {
		alert("Changes saved")
		location.href = "/admin/edit_election.html?" + election
	} else {
		alert(response.message)
	}
}
function saveYNA() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	var issue = l[1]
	
	var title = document.getElementById('ititle').value
	var nominatedby = document.getElementById('nominatedby').value
	var seconds = document.getElementById('seconds').value.split(/,\s*/).join("\n")
	var description = document.getElementById('description').value
	
	postREST("/steve/admin/edit/" + election + "/" + issue, {
		title: title,
		nominatedby: nominatedby,
		seconds: seconds,
		description: description
	},
	undefined,
	saveCallback,
	election)
}


function saveSTV() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	var issue = l[1]
	
	var title = document.getElementById('ititle').value
	var description = document.getElementById('description').value
	
	candidates = []
	statements = []
	for (var i = 0; i < 256; i++) {
		if (document.getElementById('name_' + i)) {
			var name = document.getElementById('name_' + i).value;
			var statement = document.getElementById('statement_' + i).value;
			candidates.push(name)
			statements.push(statement ? statement : "")
		}
	}
	
	postREST("/steve/admin/edit/" + election + "/" + issue, {
		title: title,
		description: description,
		candidates: JSON.stringify(candidates),
		statements: JSON.stringify(statements)
	},
	undefined,
	saveCallback,
	election)
}

function removeEditCandidate(indice) {
	edit_i.candidates.splice(indice, 1);
	renderEditCandidates()
}

function addEditCandidate() {
	var name = window.prompt("Enter name of candidate:")
	if (name) {
		edit_i.candidates.push( {
			name: name,
			statement: "No statement made"
		})
	}
	
	renderEditCandidates()
}

function renderEditCandidates() {
	var obj = document.getElementById('candidateList')
	obj.innerHTML = "<h3>Candidates (" + edit_i.candidates.length + "):</h3><a href=\"javascript:void(addEditCandidate());\" class='btn-purple'>Add a candidate</a>"
	
	var s = 0
	for (c in edit_i.candidates) {
		s++;
		var candidate = edit_i.candidates[c]
		var name = candidate.name
		var statement = candidate.statement
		var h = document.createElement('h4')
		h.innerHTML = name + " &nbsp; - &nbsp <a href='javascript:void(removeEditCandidate(\"" + name + "\"));'>Delete</a>"
		obj.appendChild(h)
		obj.appendChild(keyvaluepair("name_" + c, "Name:", "text", name, false, "edit_i.candidates[" + c + "].name = this.value"))
		obj.appendChild(keyvaluepair("statement_" + c, "Statement/seconds:", "textarea", statement ? statement : "", false, "edit_i.candidates[" + c + "].statement = this.value"))
		obj.appendChild(document.createElement('hr'))
	}
}

function renderEditIssue(code, response, issue) {
	if (code == 200) {
		var obj = document.getElementById('preloaderWrapper')
		obj.setAttribute("id", "contents")
		for (i in response.issues) {
			if (response.issues[i].id == issue) {
				edit_i = response.issues[i]
				break
			}
		}
		if (!edit_i) {
			obj.innerHTML = "<h3>No such issue found :( </h3>"
		}
		else if (edit_i.type == "yna") {
			obj.innerHTML = "<h3>Editing a YNA issue</h3>"
			
			obj.appendChild(keyvaluepair("id", "Issue ID:", "text", edit_i.id, true))
			obj.appendChild(keyvaluepair("ititle", "Issue title:", "text", edit_i.title))
			obj.appendChild(keyvaluepair("nominatedby", "Nominated by:", "text", edit_i.nominatedby))
			obj.appendChild(keyvaluepair("seconds", "Seconded by:", "text", (edit_i.seconds ? edit_i.seconds : []).join(", ")))
			obj.appendChild(document.createElement('hr'))
			obj.appendChild(keyvaluepair("description", "Description/statement:", "textarea", edit_i.description))
			
			var div = document.createElement('div')
			div.setAttribute("class", "keyvaluepair")
			var btn = document.createElement('input')
			btn.setAttribute("type", "button")
			btn.setAttribute("class", "btn-green")
			btn.setAttribute("value", "Save changes")
			btn.setAttribute("onclick", "saveYNA();")
			div.appendChild(btn)
			obj.appendChild(div)
		} else if (edit_i.type.match(/^stv/)) {
			
			// base data
			obj.innerHTML = "<h3>Editing an " + edit_i.type.toUpperCase() + " issue</h3>"
			obj.appendChild(keyvaluepair("id", "Issue ID:", "text", edit_i.id, true))
			obj.appendChild(keyvaluepair("ititle", "Issue title:", "text", edit_i.title))
			obj.appendChild(keyvaluepair("description", "Description (optinal):", "textarea", edit_i.description))
			obj.appendChild(document.createElement('hr'))
			
			// candidates
			var cobj = document.createElement('div')
			cobj.setAttribute("id", "candidateList")
			cobj.setAttribute("class", "candidateEditList")
			obj.appendChild(cobj)
			
			var div = document.createElement('div')
			div.setAttribute("class", "keyvaluepair")
			var btn = document.createElement('input')
			btn.setAttribute("type", "button")
			btn.setAttribute("class", "btn-green")
			btn.setAttribute("value", "Save changes")
			btn.setAttribute("onclick", "saveSTV();")
			div.appendChild(btn)
			obj.appendChild(div)
			renderEditCandidates()
		} else if (edit_i.type.match(/^dh/)) {
			
			// base data
			obj.innerHTML = "<h3>Editing a D'Hondt (" + edit_i.type.toUpperCase() + ") issue</h3>"
			obj.appendChild(keyvaluepair("id", "Issue ID:", "text", edit_i.id, true))
			obj.appendChild(keyvaluepair("ititle", "Issue title:", "text", edit_i.title))
			obj.appendChild(keyvaluepair("description", "Description (optinal):", "textarea", edit_i.description))
			obj.appendChild(document.createElement('hr'))
			
			// candidates
			var cobj = document.createElement('div')
			cobj.setAttribute("id", "candidateList")
			cobj.setAttribute("class", "candidateEditList")
			obj.appendChild(cobj)
			
			var div = document.createElement('div')
			div.setAttribute("class", "keyvaluepair")
			var btn = document.createElement('input')
			btn.setAttribute("type", "button")
			btn.setAttribute("class", "btn-green")
			btn.setAttribute("value", "Save changes")
			btn.setAttribute("onclick", "saveSTV();")
			div.appendChild(btn)
			obj.appendChild(div)
			renderEditCandidates()
		}
	} else {
		alert(response.message)
	}
}

function renderEditBasedata(code, response, election) {
	if (code == 200) {
		
		var obj = document.getElementById('preloaderWrapper')
		obj.setAttribute("id", "contents")
		obj.innerHTML = ""
		
		document.getElementById('title').innerHTML += response.base_data.title;
		
		obj.appendChild(keyvaluepair("id", "Election ID:", "text", election, true))
		obj.appendChild(keyvaluepair("type", "Open election?:", "text", response.base_data.open, true))
		obj.appendChild(keyvaluepair("etitle", "Election title:", "text", response.base_data.title))
		obj.appendChild(keyvaluepair("etitle", "Monitors:", "text", response.base_data.monitors.join(", "), true))
		obj.appendChild(document.createElement('hr'))
		//obj.appendChild(keyvaluepair("description", "Description/statement:", "textarea", edit_i.description))
		
		var div = document.createElement('div')
		div.setAttribute("class", "keyvaluepair")
		var btn = document.createElement('input')
		btn.setAttribute("type", "button")
		btn.setAttribute("class", "btn-green")
		btn.setAttribute("value", "Save changes")
		btn.setAttribute("onclick", "saveElection();")
		div.appendChild(btn)
		obj.appendChild(div)
	} else {
		alert(response.message)
	}
}

function saveElectionCallback(code, response, election) {
	if (code == 200) {
		alert("Changes saved")
		location.href = "/admin/edit_election.html?" + election
	} else {
		alert(response.message)
	}
}
function saveElection() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	
	var title = document.getElementById('etitle').value
	
	postREST("/steve/admin/edit/" + election, {
		title: title
	},
	undefined,
	saveElectionCallback,
	election)
}

function closeElectionCallback(code, response, election) {
	if (code == 200) {
		alert(response.message)
		location.href = "/admin/edit_election.html?" + election
	} else {
		alert(response.message)
	}
}
function closeElection(reopen) {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	
	postREST("/steve/admin/close/" + election, {
		reopen: reopen ? "true" : null
		},
	undefined,
	closeElectionCallback,
	election)
}


function deleteIssueCallback(code, response, election) {
	if (code == 200) {
		alert("Issue deleted")
		location.href = "/admin/edit_election.html?" + election
	} else {
		alert(code + ":" + response.message)
	}
}
function deleteIssue() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	getJSON("/steve/admin/delete/" + document.location.search.substr(1), election, deleteIssueCallback)
}

function peekAtElection() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	getJSON("/steve/admin/temp/" + document.location.search.substr(1), election, peekCallback)
}

function peekCallback(code, response, election) {
	if (code == 200) {
		location.href = "/election.html?" + election + "/" + response.id
	} else {
		alert(response.message)
	}
}

function changeSTVType(type) {
	if (type == "yna") {
		document.getElementById('yna').style.display = "block";
		document.getElementById('stv').style.display = "none";
	} else {
		document.getElementById('yna').style.display = "none";
		document.getElementById('stv').style.display = "block";
	}
}

function createIssueCallback(code, response, state) {
	if (code == 201) {
		location.href = "/admin/edit_election.html?" + state.election
	} else {
		alert(response.message)
	}
}

function createIssue(election) {
	election = election ? election : document.location.search.substr(1);
	var iid = document.getElementById('iid').value;
	var type = document.getElementById('type').value;
	var title = document.getElementById('ititle').value;
	var description = document.getElementById('description').value;
	var seconds = document.getElementById('seconds').value
	var nominatedby = document.getElementById('nominatedby').value
	var candidates = document.getElementById('candidates').value
	
	if (!iid || iid.length == 0) {
		iid = parseInt(Math.random()*987654321).toString(16).toLowerCase()
	}
	
	postREST("/steve/admin/create/" + election + "/" + iid, {
		type: type,
		title: title,
		description: description,
		nominatedby: nominatedby,
		seconds: seconds,
		candidates: candidates
	}, undefined, createIssueCallback, { election: election, issue: iid})
}


var step = -1;
var election_data = null
function loadElection(election, uid, callback) {
	
	var messages = ["Herding cats...", "Shaving yaks...", "Shooing some cows away...", "Fetching election data...", "Loading issues..."]
	if (!election || !uid) {
		var l = document.location.search.substr(1).split("/");
		election = l[0];
		uid = l.length > 1 ? l[l.length-1] : "";
	}
	if (step == -1) {
		getJSON("/steve/voter/view/" + election + "?uid=" + uid, [election,uid, callback], displayElection)
	}
	
	var obj = document.getElementById('preloader');
	step++;
	if (!election_data && obj) {
		if (step % 2 == 1) obj.innerHTML = messages[parseInt(Math.random()*messages.length-0.01)]
	} else if (obj && (step % 2 == 1)) {
		obj.innerHTML = "Ready..!"
	}
	if (step % 2 == 1 && obj) {
		obj.style.transform = "translate(0,0)"
	} else if (obj) {
		obj.style.transform = "translate(0,-500%)"
	}
	if (!election_data|| (step % 2 == 0) ) {
		window.setTimeout(loadElection, 750, election, uid, callback);
	}
}

function displayElection(code, response, el) {
	election_data = response
	if (code == 200) {
		window.setTimeout(el[2], 100, response, el);
	} else {
		document.getElementById('preloaderWrapper').innerHTML = "<h1>Sorry, an error occured while fetching election data:</h1><h2>" + response.message + "</h2>"
		if (code == 403) {
			document.getElementById('preloaderWrapper').innerHTML += "<p>If this is an open election, you may request a voter ID sent to you by following <a href='/request_link.html?" + el[0] + "'>this link</a>.</p>"
		}
	}
}

function renderElectionFrontpage(response, el) {
	var par = document.getElementById('preloaderWrapper')
	par.innerHTML = "";
	
	var title = document.createElement('h1');
	title.innerHTML = response.base_data.title;
	par.appendChild(title);
	
	var issueList = document.createElement('ol');
	issueList.setAttribute("class", "issueList")
	
	var s = 0;
	var ynas = 0;
	for (i in response.issues) {
		var issue = response.issues[i]
		if (issue.type == "yna") {
			ynas++;
		}
		s++;
		var outer = document.createElement('li');
		// Set style
		outer.setAttribute("class", "issueListItem")
		
		var no = document.createElement('div');
		no.setAttribute("class", "issueNumber")
		no.innerHTML = (s)
		
		if (issue.hasVoted) {
			outer.setAttribute("style", "background: linear-gradient(to bottom, #d8d8d8 0%,#aaaaaa 100%);")
			outer.setAttribute("title", "Notice: You have already voted once on this issue")
		} else {
			outer.setAttribute("title", "You have not yet voted on this issue");
		}
		
		// Add issue
		var inner = document.createElement('span')
		inner.innerHTML = issue.id + ": " + issue.title;
		outer.appendChild(no)
		outer.appendChild(inner)
		outer.setAttribute("onclick", "location.href='ballot_" + issue.category + ".html?" + el[0] + "/" + issue.id + "/" + (el[1] ? el[1] : "") + "';")
		outer.style.animation = "fadein " + (0.5 +  (s/6)) + "s"
		issueList.appendChild(outer)
	}
	par.appendChild(issueList)
	
	if (ynas > 1) {
		var btn = document.createElement("input")
		btn.setAttribute("type", "button")
		btn.setAttribute("class", "btn-green")
		btn.setAttribute("style", "margin: 30px;")
		btn.setAttribute("value", "Bulk vote on YNA issues")
		btn.setAttribute("onclick", "location.href='/bulk_yna.html?" + el[0] + "/" + el[1] + "';")
		par.appendChild(btn)
	}
	
	if (response.base_data.monitors && response.base_data.monitors.length > 0) {
		var p = document.createElement('div')
		p.setAttribute("style", "width: 100%; float: left; text-align: center;")
		p.innerHTML = "Should you experience issues with your voting, or if you have any questions, please don't hesitate to contact the vote monitors: "
		var m = response.base_data.monitors.join(", ")
		p.innerHTML += "<a href='mailto:" + m + "?subject=Issues%20with%20election%20" + response.base_data.id + "%20at%20" + response.baseurl + "'>" + m + "</a>."
		par.appendChild(p)
	}
	
}




function renderElectionBulk(response, el) {
	var par = document.getElementById('preloaderWrapper')
	par.innerHTML = "";
	par.setAttribute("id", "contents")
	
	var title = document.createElement('h1');
	title.innerHTML = "Bulk YNA voting for: " + response.base_data.title;
	par.appendChild(title);
	
	var issueList = document.createElement('ol');
	issueList.setAttribute("class", "issueList")
	
	var s = 0;
	var ynas = 0;
	for (i in response.issues) {
		var issue = response.issues[i]
		if (issue.type == "yna") {
				
			s++;
			var outer = document.createElement('li');
			// Set style
			outer.setAttribute("class", "issueListItemWide")
			
			var no = document.createElement('div');
			no.setAttribute("class", "issueNumber")
			no.innerHTML = (s)
			
			// Add issue
			var inner = document.createElement('span')
			inner.innerHTML = issue.title;
			outer.appendChild(no)
			outer.appendChild(inner)
			outer.style.height = "32px"
			outer.style.marginBottom = "15px"
			
			// details
			if (issue.hasVoted) {
				outer.setAttribute("style", "margin-bottom: 15px; background: linear-gradient(to bottom, #d8d8d8 0%,#aaaaaa 100%);")
				outer.setAttribute("title", "Notice: You have already voted once on this issue")
			} else {
				outer.setAttribute("title", "You have not yet voted on this issue");
			}
			
			var statement = document.createElement('div')
            statement.setAttribute("class", "statement_marker")
			statement.style.float = "left"
			statement.style.marginRight = "15px"
            statement.setAttribute("title", "Click to read issue details")
            statement.innerHTML = "<a href='#details_"+issue.id+"'>Details</a>"
			outer.appendChild(statement)
			
			
			var popup = document.createElement("div")
            popup.setAttribute("class", "modal")
            popup.setAttribute("id", "details_" + issue.id)
            popup.setAttribute("aria-hidden", "true")
            
            var popupd = document.createElement("div")
            popupd.setAttribute("class", "modal-dialog")
            popup.appendChild(popupd)
            
            var popuph = document.createElement("div")
            popuph.setAttribute("class", "modal-header")
            popuph.innerHTML = '<h2>Details about issue #' + issue.id + ": " + issue.title + '</h2><a href="#close" class="btn-close" aria-hidden="true">&#215;</a>'
            
			details = "<b>Nominated by: </b>" + issue.nominatedby + "<br/>"
			details += "<b>Seconded by: </b>" + (issue.seconds ? issue.seconds : "no-one") + "<br/>"
			details += "<br/><b>Description:<blockquote>" + issue.description + "</blockquote>"
            var popupb = document.createElement("div")
            popupb.setAttribute("class", "modal-body")
            popupb.innerHTML = '<pre>' + details + '</pre>'
            
            var popupf = document.createElement("div")
            popupf.setAttribute("class", "modal-footer")
            popupf.innerHTML = '<a href="#close" class="btn">Close window</a>'
            
            popupd.appendChild(popuph)
            popupd.appendChild(popupb)
            popupd.appendChild(popupf)
            
            document.getElementsByTagName('body')[0].appendChild(popup)
			
			
			
			
			
			var yes = document.createElement('input')
			yes.setAttribute("type", "button")
			yes.setAttribute("value", "Yes")
			yes.setAttribute("class", "btn-green")
			yes.setAttribute("style", "float: right;");
			yes.setAttribute("onclick", "castVote('" + el[0] + "', '" + issue.id + "', '" + el[1] + "', 'y');")
			
			var no = document.createElement('input')
			no.setAttribute("type", "button")
			no.setAttribute("value", "No")
			no.setAttribute("class", "btn-red")
			no.setAttribute("style", " float: right;");
			no.setAttribute("onclick", "castVote('" + el[0] + "', '" + issue.id + "', '" + el[1] + "', 'n');")
			
			var abstain = document.createElement('input')
			abstain.setAttribute("type", "button")
			abstain.setAttribute("value", "Abstain")
			abstain.setAttribute("class", "btn-yellow")
			abstain.setAttribute("style", "float: right;");
			abstain.setAttribute("onclick", "castVote('" + el[0] + "', '" + issue.id + "', '" + el[1] + "', 'a');")
			
			var mark = document.createElement('img');
			mark.setAttribute("width", "26")
			mark.setAttribute("height", "32")
			mark.setAttribute("style", "float: right; margin-left: 10px;")
			mark.setAttribute("id", "mark_" + issue.id)
			
			inner.appendChild(mark)
			inner.appendChild(no)
			inner.appendChild(abstain)
			inner.appendChild(yes)
			outer.style.animation = "fadein " + (0.5 +  (s/6)) + "s"
			issueList.appendChild(outer)
		}
	}
	par.appendChild(issueList)

}

function castVote(election, issue, uid, vote) {
	var mark = document.getElementById('mark_' + issue);
	if (mark) {
		mark.setAttribute("src", "/images/vote_" + vote[0] + ".png")
	}
	postREST("/steve/voter/vote/" + election + "/" + issue, {
		uid: uid,
		vote: vote
	},
	undefined,
	castVoteCallback,
	issue)
}

function castVoteCallback(code, response, issue) {
	if (code == 200) {
		//code
	} else {
		alert(response.message)
	}
}

function showElections(code, response, state) {
	var obj = document.getElementById('preloaderWrapper')
	obj.setAttribute("id", "contents")
	//obj.setAttribute("id", "electionWrapper")
	obj.innerHTML = "<h2>Your elections:</h2><p>Click on an election to edit it</p>"
	var ol = document.createElement('ol')
	obj.appendChild(ol)
	obj.setAttribute("class", "issueList")
	var s = 0
	for (i in response.elections) {
		s++;
		var election = response.elections[i]

		var outer = document.createElement('li');
		outer.setAttribute("class", "issueListItemWide")
		if (election.closed) {
			outer.setAttribute("class", "issueListItemWideClosed")
			outer.setAttribute("title", "This election has beeen closed")
		}
		
		var no = document.createElement('div');
		no.setAttribute("class", "issueNumber")
		no.innerHTML = (s)
		
		
		// Add election
		var inner = document.createElement('span')
		inner.innerHTML = election.id + ": " + election.title;
		outer.appendChild(no)
		outer.appendChild(inner)
		outer.setAttribute("onclick", "location.href='edit_election.html?" + election.id + "';")
		ol.appendChild(outer)
	}
}



function castSingleVote(vote) {
    var l = document.location.search.substr(1).split("/");
    election = l[0];
    issue = l.length > 1 ? l[l.length-2] : "";
    uid = l.length > 2 ? l[l.length-1] : "";
	postREST("/steve/voter/vote/" + election + "/" + issue, {
        uid: uid,
        vote: vote
        },
        undefined,
        castSingleVoteCallback,
        null)
}

function castSingleVoteCallback(code, response, state) {
    if (code != 200) {
        alert(response.message)
    } else {
        document.getElementById('ynavote').innerHTML = "<h2>Your vote has been registered!</h2><p style='text-align:center;'><big>Should you reconsider, you can always reload this page and vote again.<br/><br/><a href=\"javascript:void(location.href='election.html'+document.location.search);\">Back to election front page</a></big></p>"
    }
}




function displayIssueYNA(code, response, state) {
    election_data = response
	var obj = document.getElementById('preloaderWrapper')
	obj.setAttribute("id", "ynavote")
    if (code != 200) {
        obj.innerHTML = "<h1>Could not load issue:</h1><h2>" + response.message + "</h2>";
    } else {
		obj.innerHTML = ""
		
		var title = document.createElement('h2')
		title.innerHTML = response.issue.title;
		obj.appendChild(title)
		
		obj.appendChild(keyvaluepairText("nominatedby", "Put forward (nominated) by:", response.issue.nominatedby))
		obj.appendChild(keyvaluepairText("seconds", "Seconded by:", response.issue.seconds.length > 0 ?  response.issue.seconds.join(", ") : "no-one" ))
		
		var desc = document.createElement('pre')
		desc.setAttribute("class", "statement")
		desc.innerHTML = response.issue.description
		obj.appendChild(desc)
		
		var outer = document.createElement('div')
		outer.setAttribute("class", "issueListItem")
		
		var yes = document.createElement('input')
		yes.setAttribute("type", "button")
		yes.setAttribute("value", "Yes")
		yes.setAttribute("class", "btn-green")
		yes.setAttribute("style", "float: right;");
		yes.setAttribute("onclick", "castSingleVote('y');")
		
		var no = document.createElement('input')
		no.setAttribute("type", "button")
		no.setAttribute("value", "No")
		no.setAttribute("class", "btn-red")
		no.setAttribute("style", " float: right;");
		no.setAttribute("onclick", "castSingleVote('n');")
		
		var abstain = document.createElement('input')
		abstain.setAttribute("type", "button")
		abstain.setAttribute("value", "Abstain")
		abstain.setAttribute("class", "btn-yellow")
		abstain.setAttribute("style", "float: right;");
		abstain.setAttribute("onclick", "castSingleVote('a');")
		
		var p = document.createElement('p')
		p.innerHTML = "Cast your vote by clicking on the respective button below. You may recast your vote as many time as you like, should you reconsider."
		
		obj.appendChild(p)
		outer.appendChild(no)
		outer.appendChild(abstain)
		outer.appendChild(yes)
		
		obj.appendChild(outer)
	}
}



function primeMonitorsCallback(code, response, election) {
	alert(response.message)
}
function primeMonitors() {
	var l = document.location.search.substr(1).split('/');
	var election = l[0]
	
	
	postREST("/steve/admin/debug/" + election, {
		
	},
	undefined,
	primeMonitorsCallback,
	election)
}

function setVoteTypes(code, response, state) {
	if (code == 200) {
		var tobj = document.getElementById('type');
		var sortable = []
		for (i in response.types) {
			var type = response.types[i]
			var option = document.createElement("option");
			option.text = type;
			option.value = i;
			sortable.push([option, type])
		}
		sortable.sort(function(a,b) { return (a[1] > b[1])})
		for (i in sortable) {
			tobj.add(sortable[i][0])
		}
	} else {
		alert(response.message)
	}
	
}