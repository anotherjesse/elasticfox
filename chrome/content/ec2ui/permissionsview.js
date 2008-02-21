var ec2ui_PermissionsTreeView = {
	COLNAMES : ['permission.protocol','permission.fromPort','permission.toPort','permission.groups','permission.cidrs'],
	treeBox : null,
	selection : null,
	permissionList : new Array(),

	get rowCount() { return this.permissionList.length; },

	setTree     : function(treeBox)		{ this.treeBox = treeBox; },
	getCellText : function(idx, column)	{
		if (idx >= this.rowCount) return "";
		return eval("this.permissionList[idx]."+column.id.split(".").pop());
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
			this.permissionList);
	},
	
	viewDetails : function(event) {
		var perm = this.getSelectedPermission();
		if (perm == null) return;
		window.openDialog("chrome://ec2ui/content/dialog_permission_details.xul", null, "chrome,centerscreen,modal", perm);
	},

	sort : function() {
		sortView(document, this.COLNAMES, this.permissionList);
	},

	selectionChanged: function() {},
	cycleCell: function(idx, column) {},
	performAction: function(action) {},
	performActionOnCell: function(action, index, column) {},
	getRowProperties: function(idx, column, prop) {},
	getCellProperties: function(idx, column, prop) {},
	getColumnProperties: function(column, element, prop) {},
	getLevel : function(idx) { return 0; },
	
	grantPermission : function() {
		var group = ec2ui_SecurityGroupsTreeView.getSelectedGroup();
		if (group == null) return;
		
		retVal = {ok:null};
		window.openDialog("chrome://ec2ui/content/dialog_new_permission.xul", null, "chrome,centerscreen,modal", group, ec2ui_session, retVal);
		
		if (retVal.ok) {
			var me = this;
			var wrap = function() {
				if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
					ec2ui_SecurityGroupsTreeView.refresh();
					ec2ui_SecurityGroupsTreeView.selectByName(group.name);
					//permission.selectBy???()
				}
			}
			if (retVal.cidrIp != null) {
				ec2ui_session.controller.authorizeSourceCIDR(retVal.groupName, retVal.ipProtocol, retVal.fromPort, retVal.toPort, retVal.cidrIp, wrap);
			} else {
				ec2ui_session.controller.authorizeSourceGroup(retVal.groupName, retVal.sourceSecurityGroupName, retVal.sourceSecurityGroupOwnerId, wrap);
			}
		}
	},

	getSelectedPermission : function() {
		var index =  this.selection.currentIndex;
		if (index == -1) return null;
		return this.permissionList[this.selection.currentIndex];
	},

	revokePermission : function() {
		var group = ec2ui_SecurityGroupsTreeView.getSelectedGroup();
		if (group == null) return;
		var permission = this.getSelectedPermission();
		if (permission == null) return;

		var confirmed = confirm("Revoke selected permission on group "+group.name+"?");
		if (!confirmed)
			return;
	   
		var me = this;
		var wrap = function() {
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				ec2ui_SecurityGroupsTreeView.refresh();
				ec2ui_SecurityGroupsTreeView.selectByName(group.name);
				//permission.selectBy???()
			}
		}
		
		if (permission.ipRanges.length > 0) {
			ec2ui_session.controller.revokeSourceCIDR(group.name, permission.protocol, permission.fromPort, permission.toPort, permission.ipRanges[0], wrap);
		} else {
			ec2ui_session.controller.revokeSourceGroup(group.name, permission.groupTuples[0][1], permission.groupTuples[0][0], wrap);
		}
	},
	
	displayPermissions : function (permissionList) {
		this.treeBox.rowCountChanged(0, -this.permissionList.length);
		this.permissionList = permissionList;
		this.treeBox.rowCountChanged(0, this.permissionList.length);
		this.sort();
		this.selection.clearSelection();
		if (permissionList.length > 0) {
			this.selection.select(0);
		}
	}
};

