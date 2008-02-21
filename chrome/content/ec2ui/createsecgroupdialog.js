var ec2_SecGroupCreator = {
	ec2ui_session : null,
	retVal : null,

	createGroup : function() {
		if (!this.validateGroupName()) return false;
		if (!this.validateGroupDesc()) return false;
		this.retVal.name = document.getElementById("ec2ui.newsecgroup.name").value;
		this.retVal.description = document.getElementById("ec2ui.newsecgroup.description").value;
		this.retVal.ok = true;
		return true;
	},
	
	validateGroupName : function() {
		var textbox = document.getElementById("ec2ui.newsecgroup.name");
		if (textbox.value == "") {
			alert("Please provide a group name");
			textbox.select();
			return false;
		}
		return true;
	},
	
	validateGroupDesc : function() {
		var textbox = document.getElementById("ec2ui.newsecgroup.description");
		if (textbox.value == "") {
			alert("Please provide a description");
			textbox.select();
			return false;
		}
		return true;
	},

	init : function() {
		this.ec2ui_session = window.arguments[0];
		this.retVal = window.arguments[1];
	}
}
