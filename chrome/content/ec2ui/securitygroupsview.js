var ec2ui_SecurityGroupsTreeView = {
	COLNAMES : ['security.group.ownerId','security.group.name','security.group.description'],
	treeBox : null,
	selection : null,
	groupList : new Array(),
	registered : false,

	get rowCount() { return this.groupList.length; },

	setTree     : function(treeBox)		{ this.treeBox = treeBox; },
	getCellText : function(idx, column)	{
		if (idx >= this.rowCount) return "";
		return eval("this.groupList[idx]."+column.id.split(".").pop());
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
			this.groupList);
		this.selectionChanged();
	},
	
	viewDetails : function(event) {
		var group = this.getSelectedGroup();
		if (group == null) return;
		window.openDialog("chrome://ec2ui/content/dialog_securitygroup_details.xul", null, "chrome,centerscreen,modal", group);
	},

	sort : function() {
		sortView(document, this.COLNAMES, this.groupList);
	},

	cycleCell: function(idx, column) {},
	performAction: function(action) {},
	performActionOnCell: function(action, index, column) {},
	getRowProperties: function(idx, column, prop) {},
	getCellProperties: function(idx, column, prop) {},
	getColumnProperties: function(column, element, prop) {},
	getLevel : function(idx) { return 0; },
	
	selectByName	: function(name) {
		this.selection.clearSelection();
		for(var i in this.groupList) {
			if (this.groupList[i].name == name) {
				this.selection.select(i);
				return;
			}
		}
		
		// In case we don't find a match (which is probably a bug).
		this.selection.select(0);
	},
	
	notifyModelInvalidated : function() {
		this.displayGroups(new Array());
		ec2ui_PermissionsTreeView.displayPermissions(new Array());
	},
	
	refresh	: function() {
		if (!this.registered) {
			this.registered = true;
			ec2ui_model.register(this);
		}
		
		log("Refreshing security groups view");
		// This craziness is to get around the fact that JS evaluates "this.X" in the remote context
		var me = this;
		var wrap = function(x) { me.displayGroups(x); }
		ec2ui_session.controller.describeSecurityGroups(wrap);
	},
	
	getSelectedGroup : function() {
		var index =  this.selection.currentIndex;
		if (index == -1) return null;
		return this.groupList[this.selection.currentIndex];
	},

	selectionChanged : function() {
		var index =  this.selection.currentIndex;
		if (index == -1) return;
		
		var group = this.groupList[this.selection.currentIndex];
		ec2ui_PermissionsTreeView.displayPermissions(group.permissions);
	},
	
	createNewGroup : function () {
		var retVal = {ok:null,name:null,description:null};
		window.openDialog("chrome://ec2ui/content/dialog_create_security_group.xul", null, "chrome,centerscreen,modal", ec2ui_session, retVal);
		
		if (retVal.ok) {
			var me = this;
			var wrap = function() { 
				me.refresh();
				me.selectByName(retVal.name);
			}
			ec2ui_session.controller.createSecurityGroup(retVal.name, retVal.description, wrap);
		}
	},

	deleteSelected  : function () {
		var group = this.getSelectedGroup();
		if (group == null) return;
		
		var confirmed = confirm("Delete group "+group.name+"?");
		if (!confirmed)
			return;
	   
		var me = this;
		var wrap = function() { 
			me.refresh();
			me.selectByName(group.name);
		}
		ec2ui_session.controller.deleteSecurityGroup(group.name, wrap);
	},

	displayGroups : function (groupList) {
		this.treeBox.rowCountChanged(0, -this.groupList.length);
		this.groupList = groupList;
		this.treeBox.rowCountChanged(0, this.groupList.length);
		this.sort();
		this.selection.clearSelection();
		if (groupList.length > 0) {
			this.selection.select(0);
		}
	}
};

