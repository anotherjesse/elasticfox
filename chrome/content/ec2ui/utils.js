function sortView(document, cols, list) {
	// The last portion of the id (. delimited) must be the name of the field in
	// the objects in our list.
	var sortField = null;
	var ascending = null;
	for (var i in cols) {
		var col = cols[i];
		if (document.getElementById(col) != null) {
			log("col=["+col+"]");
			var direction = document.getElementById(col).getAttribute("sortDirection");
		} else {
			log("col=["+col+"] (skipped)");
		}
		
		if (direction && direction != "natural") {
			ascending = (direction == "ascending");
			sortField = col.split('.').pop();
			break;
		}
	}
	
	if (sortField != null) {
		list.sort(function(a,b) {
	 var aVal = eval("a."+sortField+".toString().toLowerCase()");
	 var bVal = eval("b."+sortField+".toString().toLowerCase()");
	 if (aVal < bVal) return ascending?-1:1;
	 if (aVal > bVal) return ascending?1:-1;
	 return 0;
		});
	}
}

function cycleHeader(col, document, columnIdList, list) {
	var csd = col.element.getAttribute("sortDirection");
	var sortDirection = (csd == "ascending" || csd == "natural") ? "descending" : "ascending";
	for (var i = 0; i < col.columns.count; i++) {
		col.columns.getColumnAt(i).element.setAttribute("sortDirection", "natural");
	}
	col.element.setAttribute("sortDirection", sortDirection);
	sortView(document, columnIdList, list);
}

function getNodeValueByName(parent, nodeName) {
	var node = parent.getElementsByTagName(nodeName)[0];
	if (node == null) return "";
	return node.firstChild ? node.firstChild.nodeValue : "";
}

function methodPointer(obj, method) {
	 var wrap = function(x) { obj.method(x); }
	
}

function trim(s) {
	return s.replace(/^\s*/, '').replace(/\s*$/, '');
}

function getProperty(name, defValue) {
	try {
		return document.getElementById('ec2ui.properties.bundle').getString(name);
	} catch(e) {
		return defValue;
	}
}

function log(msg) {
	try {
		if (ec2ui_prefs.isDebugEnabled()) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
			consoleService.logStringMessage("[ec2ui] " + msg);
		}
	} catch (e) {
	}
}

function copyToClipboard(text) {
   var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
   str.data = text;

   var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
   trans.addDataFlavor("text/unicode");
   trans.setTransferData("text/unicode", str, text.length * 2);

   var clipid = Components.interfaces.nsIClipboard; 
   var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid); 
   clip.setData(trans,null,clipid.kGlobalClipboard);
}

// With thanks to http://delete.me.uk/2005/03/iso8601.html
Date.prototype.setISO8601 = function (string) {
   var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" + "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" + "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?"; 
   var d = string.match(new RegExp(regexp));
   var offset = 0; var date = new Date(d[1], 0, 1); 
   if (d[3]) { 
      date.setMonth(d[3] - 1); 
   } 
   if (d[5]) { 
      date.setDate(d[5]); 
   } 
   if (d[7]) { 
      date.setHours(d[7]); 
   } 
   if (d[8]) { 
      date.setMinutes(d[8]); 
   } 
   if (d[10]) { 
      date.setSeconds(d[10]); 
   } 
   if (d[12]) { 
      date.setMilliseconds(Number("0." + d[12]) * 1000); 
   } 
   if (d[14]) { 
      offset = (Number(d[16]) * 60) + Number(d[17]); 
      offset *= ((d[15] == '-') ? 1 : -1); 
   } 
   offset -= date.getTimezoneOffset(); 
   time = (Number(date) + (offset * 60 * 1000)); 
   this.setTime(Number(time)); 
}
