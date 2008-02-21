var ec2ui_accountIdManager = {
	accountidmap : null,
	
	initDialog : function() {	
		this.accountidmap = window.arguments[0];
		
		document.getElementById("ec2ui.accountids.view").view = ec2ui_accountIdsTreeView;
		ec2ui_accountIdsTreeView.setMapping(this.accountidmap);
	},

	removeAccount : function() {
		var accountId = document.getElementById("ec2ui.accountids.accountid").value;
		if (accountId == null || accountId == "") return;

		this.accountidmap.removeKey(accountId);
		ec2ui_accountIdsTreeView.setMapping(this.accountidmap);
	},
	
	saveAccount : function() {
		var accountId = document.getElementById("ec2ui.accountids.accountid").value;
		var displayName = document.getElementById("ec2ui.accountids.displayname").value;
		if (accountId == null || accountId == "") return;
		if (displayName == null || displayName == "") return;

		this.accountidmap.put(accountId, displayName);
		ec2ui_accountIdsTreeView.setMapping(this.accountidmap);
	},
	
	selectMapping : function() {
		var sel = ec2ui_accountIdsTreeView.getSelectedEntry();
		if (sel != null) {
			document.getElementById("ec2ui.accountids.accountid").value = sel.accountid;
			document.getElementById("ec2ui.accountids.displayname").value = sel.displayname;
		}
	}
}
