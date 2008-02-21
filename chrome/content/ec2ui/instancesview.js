var ec2ui_InstancesTreeView = {
	COLNAMES : [
	   'instance.resId',
	   'instance.ownerId',
	   'instance.id',
	   'instance.imageId',
	   'instance.state',
	   'instance.publicDnsName',
	   'instance.privateDnsName',
	   'instance.keyName',
	   'instance.groups',
	   'instance.reason',
	   'instance.amiLaunchIdx',
	   'instance.instanceType',
	   'instance.launchTime'
	],
	treeBox: null,
	selection: null,
	instanceList : new Array(),
	registered : false,

	get rowCount() { return this.instanceList.length; },

	setTree     : function(treeBox)		{ this.treeBox = treeBox; },
	getCellText : function(idx, column)	{
		if (idx >= this.rowCount) return "";
		return eval("this.instanceList[idx]."+column.id.split(".").pop());
	},
	
	getCellProperties : function(row, col, props) {
		var shortName = col.id.split(".").pop();
		if (shortName == "state") {
			var stateName = this.instanceList[row].state.replace('-','_').toLowerCase();
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom("instance_"+stateName));
		}
	},
	
	isEditable: function(idx, column)  { return true; },
	isContainer: function(idx)         { return false;},
	isSeparator: function(idx)         { return false; },
	isSorted: function()               { return false; },
	
	getImageSrc: function(idx, column) { return ""; },
	getProgressMode : function(idx,column) {},
	getCellValue: function(idx, column) {},
	cycleHeader: function(col) {
		cycleHeader(
			col, 
			document, 
			this.COLNAMES,
			this.instanceList);
	},
	
	viewDetails : function(event) {
		var selected = new Array();
		for(var i in this.instanceList) {
			if (this.selection.isSelected(i)) {
				selected.push(this.instanceList[i]);
			}
		}
		if (selected.length != 1) return;
		
		window.openDialog("chrome://ec2ui/content/dialog_instance_details.xul", null, "chrome,centerscreen,modal", selected[0]);
	},

	sort : function() {
		sortView(document, this.COLNAMES, this.instanceList);
	},

	selectionChanged: function() {},
	cycleCell: function(idx, column) {},
	performAction: function(action) {},
	performActionOnCell: function(action, index, column) {},
	getRowProperties: function(idx, column, prop) {},
	getColumnProperties: function(column, element, prop) {},
	getLevel : function(idx) { return 0; },

	selectByInstanceIds	: function(list) {
		this.selection.clearSelection();
		for(var i in list) {
			this.selectByInstanceId(list[i].id);
		}
	},
	
	selectByInstanceId	: function(instanceId) {
		for(var i in this.instanceList) {
			if (this.instanceList[i].id == instanceId) {
				this.selection.toggleSelect(i);
				return;
			}
		}
	},
	
	selectionChanged : function(event) {
		// When an instance is selected, select the associated AMI
		// but only if a single instance has been selected
		var imageIds = new Array();
		for(var i in this.instanceList) {
			if (this.selection.isSelected(i)) {
				imageIds.push(this.instanceList[i].imageId);
			}
		}
		if (imageIds.length != 1)
			return;

		ec2ui_AMITreeView.selectByImageId(imageIds[0]);
	},
	
	notifyModelInvalidated : function() {
		this.displayInstances(new Array());
	},
	
	refresh	: function() {
		if (!this.registered) {
			this.registered = true;
			ec2ui_model.register(this);
		}
		
		// This craziness is to get around the fact that JS evaluates "this.X" in the remote context
		var me = this;
		var wrap = function(x) { me.displayInstances(x); }
		ec2ui_session.controller.describeInstances(wrap);
	},

	launchMore  : function () {
		var index =  this.selection.currentIndex;
		if (index == -1) return;
		
		var instance = this.instanceList[this.selection.currentIndex];
		var count = prompt("How many more instances of "+instance.id+"?", "1");
		if (count == null || count == "")
			return;
	   
		var me = this;
		var wrap = function(list) { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				ec2ui_InstancesTreeView.refresh();
				ec2ui_InstancesTreeView.selectByInstanceIds(list);
			}
		}
		ec2ui_session.controller.runInstances(
		   instance.imageId, 
		   count, 
		   count, 
		   instance.keyName, 
		   instance.groupList, 
		   null, 
		   null, 
		   instance.instanceType, 
		   wrap);
	},
	
	terminateInstance  : function () {
		var instanceIds = new Array();
		for(var i in this.instanceList) {
			if (this.selection.isSelected(i)) {
				instanceIds.push(this.instanceList[i].id);
			}
		}
		if (instanceIds.length == 0) 
			return;
		
		var confirmed = confirm("Terminate "+instanceIds.length+" instance(s)?");
		if (!confirmed)
			return;

		var me = this;
		var wrap = function() { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refresh(); 
				me.selectByInstanceIds();
			}
		}
		ec2ui_session.controller.terminateInstances(instanceIds, wrap);
	},
	
	fetchConsoleOutput  : function () {
		var instanceIds = new Array();
		for(var i in this.instanceList) {
			if (this.selection.isSelected(i)) {
				instanceIds.push(this.instanceList[i].id);
			}
		}
		if (instanceIds.length == 0) 
			return;
		if (instanceIds.length > 1) {
			alert("Please select a single instance");
			return;
		}
		
		var me = this;
		var wrap = function(instanceId, timestamp, output) { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refresh(); 
				me.showConsoleOutput(instanceId, timestamp, output);
			}
		}
		ec2ui_session.controller.getConsoleOutput(instanceIds[0], wrap);
	},
	
	showConsoleOutput : function(instanceId, timestamp, output) {
		window.openDialog("chrome://ec2ui/content/dialog_console_output.xul", null, "chrome,centerscreen,modal", instanceId, timestamp, output);
	},

	copyToClipBoard : function(fieldName) {
		var instances = new Array();
		for(var i in this.instanceList) {
			if (this.selection.isSelected(i)) {
				instances.push(this.instanceList[i]);
			}
		}
		if (instances.length == 0) 
			return;
		if (instances.length > 1) {
			alert("Please select a single instance");
			return;
		}

		copyToClipboard(eval("instances[0]."+fieldName));
	},

	sshTo : function(fieldName) {
	   var instances = new Array();
	   for(var i in this.instanceList) {
	      if (this.selection.isSelected(i)) {
	         instances.push(this.instanceList[i]);
	      }
	   }
	   if (instances.length == 0)
	      return;
	   if (instances.length > 1) {
	      alert("Please select a single instance");
	      return;
	   }

	   // create an nsILocalFile for the executable
	   var cmd = ec2ui_prefs.getSSHCommand();
	   var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	   file.initWithPath(cmd);
	   
	   // create an nsIProcess
	   var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
	   process.init(file);
	   
	   // Run the process.
	   // If first param is true, calling thread will be blocked until
	   // called process terminates.
	   // Second and third params are used to pass command-line arguments
	   // to the process.
	   var arg_str = ec2ui_prefs.getSSHArgs();

	   var env = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
	   var home = null;
	   if (env.exists('HOME')) {
	      home = env.get("HOME");
	   } else if (env.exists("HOMEDRIVE") && env.exists("HOMEPATH")) {
	      home = env.get("HOMEDRIVE") + env.get("HOMEPATH");
	   }
	   
	   if (home != null) {
	      arg_str = arg_str.replace(/\${home}/g, home)
	   }
	   
	   var key_template = ec2ui_prefs.getSSHKeyTemplate();
	   if (key_template != "") {
	      key_template = key_template.replace(/\${keyname}/g, instances[0].keyName);

	      if (home != null) {
		 key_template = key_template.replace(/\${home}/g, home)
	      }

	      var key_file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	      key_file.initWithPath(key_template);
	      if (key_file.exists()) {
		 arg_str = arg_str.replace(/\${key}/g, key_template);
	      }
	   }

	   var user = ec2ui_prefs.getSSHUser();
	   if (user != "") {
	      arg_str = arg_str.replace(/\${user}/g, user)
	   }

	   arg_str = arg_str.replace(/\${host}/g, eval("instances[0]."+fieldName));

	   // Finally, split args into an array
	   var args = arg_str.split(/\s+/);

	   log("ssh command: "+cmd);
	   log("ssh args: "+args.join(" "));

	   process.run(false, args, args.length);
	},

	rebootInstance  : function () {
		var instanceIds = new Array();
		for(var i in this.instanceList) {
			if (this.selection.isSelected(i)) {
				instanceIds.push(this.instanceList[i].id);
			}
		}
		if (instanceIds.length == 0) 
			return;
		
		var confirmed = confirm("Reboot "+instanceIds.length+" instance(s)?");
		if (!confirmed)
			return;

		var me = this;
		var wrap = function(list) { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refresh(); 
				me.selectByInstanceIds(list);
			}
		}
		ec2ui_session.controller.rebootInstances(instanceIds, wrap);
	},
	
	displayInstances : function (instanceList) {
		this.treeBox.rowCountChanged(0, -this.instanceList.length);
		this.instanceList = instanceList;
		this.treeBox.rowCountChanged(0, this.instanceList.length);
		this.sort();
		this.selection.clearSelection();
	}
};

