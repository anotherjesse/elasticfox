var ec2ui_AMITreeView = {
	COLNAMES: ['ami.id','ami.location','ami.state','ami.owner','ami.isPublic'],
	treeBox: null,
	selection: null,
	imageList : new Array(),
	launchPermissionList : new Array(),
	registered : false,

	get rowCount() { return this.imageList.length; },

	setTree     : function(treeBox)         { this.treeBox = treeBox; },
	getCellText : function(idx, column) {
		if (idx >= this.rowCount) return "";
		var shortName = column.id.split(".").pop();
		if (shortName == "owner") {
			return ec2ui_session.lookupAccountId(this.imageList[idx].owner);
		}
		return eval("this.imageList[idx]."+shortName);
	},

	getCellProperties : function(row, col, props) {
		var shortName = col.id.split(".").pop();
		if (shortName == "state") {
			var stateName = this.imageList[row].state.replace('-','_').toLowerCase();
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom("image_"+stateName));
		} else if (shortName == "isPublic") {
			var vizName = this.imageList[row].isPublic.replace('-','_').toLowerCase();
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom("image_"+vizName));
		} else if (shortName == "owner" && this.imageList[row].owner == "amazon") {
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom("owner_amazon"));
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
			this.imageList);
	},
	
	viewDetails : function(event) {
		var image = this.getSelectedImage();
		if (image == null) return;
		window.openDialog("chrome://ec2ui/content/dialog_ami_details.xul", null, "chrome,centerscreen,modal", image);
	},

	sort : function() {
		sortView(document, this.COLNAMES, this.imageList);
	},

	selectionChanged: function() {},
	cycleCell: function(idx, column) {},
	performAction: function(action) {},
	performActionOnCell: function(action, index, column) {},
	getRowProperties: function(idx, column, prop) {},
	getColumnProperties: function(column, element, prop) {},
	getLevel : function(idx) { return 0; },
	
	getSelectedImage : function() {
		var index =  this.selection.currentIndex;
		if (index == -1) return null;
		return this.imageList[this.selection.currentIndex];
	},
	
	launchNewInstances : function () {
		var image = this.getSelectedImage();
		if (image == null) return;
		var retVal = {ok:null};
		window.openDialog("chrome://ec2ui/content/dialog_new_instances.xul", null, "chrome,centerscreen,modal", image, ec2ui_session, retVal);
		
		if (retVal.ok) {
			var me = this;
			var wrap = function(list) {
				if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
					ec2ui_InstancesTreeView.refresh();
					ec2ui_InstancesTreeView.selectByInstanceIds(list);
				}
			}
			ec2ui_session.controller.runInstances(
			   retVal.imageId, 
			   retVal.minCount, 
			   retVal.maxCount, 
			   retVal.keyName, 
			   retVal.securityGroups, 
			   retVal.userData, 
			   retVal.properties, 
			   retVal.instanceType, 
			   wrap);
		}
	},
    
	registerNewImage : function () {
		var retVal = {ok:null,manifestPath:null};
		window.openDialog("chrome://ec2ui/content/dialog_register_image.xul", null, "chrome,centerscreen,modal", ec2ui_session, retVal);
		
		if (retVal.ok) {
			var me = this;
			var wrap = function(x) { 
				if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
					me.refresh(); 
					me.selectByImageId(x);
				}
			}
			ec2ui_session.controller.registerImage(retVal.manifestPath, wrap);
		}
	},
    
	deregisterImage  : function () {
		var index =  this.selection.currentIndex;
		if (index == -1) return;
		
		var image = this.imageList[this.selection.currentIndex];
		var confirmed = confirm("Deregister AMI "+image.id+" ("+image.location+")?");
		if (!confirmed)
			return;
	   
		var me = this;
		var wrap = function() { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refresh(); 
			}
		}
		ec2ui_session.controller.deregisterImage(image.id, wrap);
	},
	
	selectByImageId	: function(imageId) {
		log("selectByImageId ("+imageId+")");
		this.selection.clearSelection();
		for(var i in this.imageList) {
			if (this.imageList[i].id == imageId) {
				log("selectByImageId ("+imageId+") selected index "+i);
				this.selection.select(i);
				return;
			}
		}
		
		// In case we don't find a match (which is probably a bug).
		this.selection.select(0);
	},
	
	getLaunchPermissionsList : function() {
		return document.getElementById("ec2ui.launchpermissions.list");
	},
	
	getSelectedLaunchPermission : function() {
		var item = this.getLaunchPermissionsList().getSelectedItem(0);
		if (item == null) return null;
		return item.value;
	},
	
	selectLaunchPermissionByName	: function(name) {
		var list = this.getLaunchPermissionsList();
		for(var i in this.launchPermissionList) {
			if (this.launchPermissionList[i] == name) {
				list.selectedIndex = i;
				return;
			}
		}
		
		// In case we don't find a match (which is probably a bug).
		list.selectedIndex = 0;
	},
	
	refreshLaunchPermissions : function() {
		var image = this.getSelectedImage();
		if (image == null) return;
		if (image.state == "deregistered") return;
		
		var me = this;
		var wrap = function(list) { me.displayLaunchPermissions(list); }
		ec2ui_session.controller.describeLaunchPermissions(image.id, wrap);
	},
	
	addGlobalLaunchPermission : function() {
		var image = this.getSelectedImage();
		if (image == null) return;
		this.addNamedPermission(image, "all");	
	},
	
	addLaunchPermission : function() {
		var image = this.getSelectedImage();
		if (image == null) return;
		var name = prompt("Please provide an EC2 user ID");
		if (name == null) return;
		this.addNamedPermission(image, name);	
	},
	
	addNamedPermission : function(image, name) {
		var me = this;
		var wrap = function() { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refreshLaunchPermissions();
				me.selectLaunchPermissionByName(name);
			}
		}
		ec2ui_session.controller.addLaunchPermission(image.id, name, wrap);
	},

	removeLaunchPermission : function() {
		var image = this.getSelectedImage();
		if (image == null) return;
		var name = this.getSelectedLaunchPermission();
		if (name == null) return;

		var confirmed = confirm("Revoke launch permissions for "+name+" on AMI "+image.id+"?");
		if (!confirmed)
			return;

		var me = this;
		var wrap = function() { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refreshLaunchPermissions(); 
			}
		}
		ec2ui_session.controller.revokeLaunchPermission(image.id, name, wrap);
	},

	resetLaunchPermissions : function() {
		var image = this.getSelectedImage();
		if (image == null) return;

		var confirmed = confirm("Reset launch permissions for AMI "+image.id+"?");
		if (!confirmed)
			return;

		var me = this;
		var wrap = function() { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refreshLaunchPermissions(); 
			}
		}
		ec2ui_session.controller.resetLaunchPermissions(image.id, wrap);
	},
	
	displayLaunchPermissions : function (permList) {
		this.launchPermissionList = permList;

		// Clear the list (is there a better way to do this?)
		var list = this.getLaunchPermissionsList();
		var count = list.getRowCount();
		for(var i = count-1; i >= 0; i--) {
			list.removeItemAt(i);
		}
		
		// Sort 'all' to the top
		permList.sort(function(x,y) {
			if (x == 'all') return -1;
			if (y == 'all') return 1;
			return x < y ? -1 : (x == y ? 0 : 1);
		});

		for(var i in permList) {
			list.appendItem(permList[i], permList[i]);
		}
	},
	
	selectionChanged : function(event) {
		if (ec2ui_prefs.isAutoFetchLaunchPermissionsEnabled()) {
			this.refreshLaunchPermissions();
		}
	},
	
	notifyModelInvalidated : function() {
		this.displayAMIs(new Array());
		this.displayLaunchPermissions(new Array());
	},
	
	refresh	: function() {
		if (!this.registered) {
			this.registered = true;
			ec2ui_model.register(this);
		}
		
		// This craziness is to get around the fact that JS evaluates "this.X" in the remote context
		var me = this;
		var wrap = function(x) { me.displayAMIs(x); }
		ec2ui_session.controller.describeImages(wrap);
	},

	displayAMIs : function (imageList) {
		this.treeBox.rowCountChanged(0, -this.imageList.length);
		this.imageList = imageList;
		this.treeBox.rowCountChanged(0, this.imageList.length);
		this.sort();
		this.selection.clearSelection();
		if (imageList.length > 0) {
			this.selection.select(0);
		}
	}
};

