var ec2_Authorizer = {
	group : null,
	ec2ui_session : null,
	retVal : null,
	unusedSecGroupsList : null,
	usedSecGroupsList : null,
	unused : new Array(),
	used : new Array(),

	authorize : function() {
		this.retVal.groupName = document.getElementById("ec2ui.newpermission.group").value;

		this.retVal.ipProtocol = null;
		this.retVal.toPort = null;
		this.retVal.fromPort = null;
		this.retVal.cidrIp = null;

		this.retVal.sourceSecurityGroupName = null;
		this.retVal.sourceSecurityGroupOwnerId = null;
		
		var sourceType = document.getElementById("ec2ui.newpermission.sourcetype").value;
		if (sourceType == "cidr") {
			// CIDR
			if (!this.validateCIDR()) return false;
			this.retVal.cidrIp = document.getElementById("ec2ui.newpermission.source.cidr").value;
			
			var protocol = document.getElementById("ec2ui.newpermission.protocol").value;
			if (protocol == "tcp" || protocol == "udp") {
				// UDP/TCP
				if (!this.validateMinPort()) return false;
				if (!this.validateMaxPort()) return false;
			}

			this.retVal.ipProtocol = protocol;
			this.retVal.toPort = document.getElementById("ec2ui.newpermission.toport").value;
			this.retVal.fromPort = document.getElementById("ec2ui.newpermission.fromport").value;
		} else {
			// User:Group
			if (!this.validateSourceUserGroup()) return false;
			this.retVal.sourceSecurityGroupName = document.getElementById("ec2ui.newpermission.source.group").value;
			this.retVal.sourceSecurityGroupOwnerId = document.getElementById("ec2ui.newpermission.source.user").value;
		}
		
		this.retVal.ok = true;
		return true;
	},
	
	validateMinPort : function() {
		var textbox = document.getElementById("ec2ui.newpermission.fromport");
		var val = parseInt(textbox.value);
		if (val < 0 || isNaN(val)) {
			alert("Lower port range bound must be a non-negative integer");
			textbox.select();
			return false;
		}
		return true;
	},

	validateMaxPort : function() {
		// Assumes validateMin has been called
		var maxtextbox = document.getElementById("ec2ui.newpermission.toport");
		var maxval = parseInt(maxtextbox.value);
		if (maxval < 0 || isNaN(maxval)) {
			alert("Upper port range bound must be a non-negative integer");
			maxtextbox.select();
			return false;
		}
		var mintextbox = document.getElementById("ec2ui.newpermission.fromport");
		var minval = parseInt(mintextbox.value);
		if (minval > maxval) {
			alert("Upper port range bound may not be smaller than lower bound");
			alert("Maximum value may not be smaller than minimum value");
			maxtextbox.select();
			return false;
		}
		return true;
	},

	validateCIDR : function() {
		var textbox = document.getElementById("ec2ui.newpermission.source.cidr");
		if (textbox.value == "") {
			alert("Please provide a source CIDR");
			textbox.select();
			return false;
		}
		var cidrre = new RegExp("^\\d+\\.\\d+\\.\\d+\\.\\d+\\/\\d+$");
		if (textbox.value.match(cidrre) == null) {
			alert("Malformed CIDR, expecting n.n.n.n/n");
			textbox.select();
			return false;
		}
		return true;
	},
	
	validateSourceUserGroup : function() {
		var user = document.getElementById("ec2ui.newpermission.source.user");
		if (user.value == "") {
			alert("Please provide a source user ID");
			user.select();
			return false;
		}
		var group = document.getElementById("ec2ui.newpermission.source.group");
		if (group.value == "") {
			alert("Please provide a source security group name");
			group.select();
			return false;
		}
		return true;
	},

	selectSourceTypeDeck : function(index) {
		var deck = document.getElementById("ec2ui.newpermission.deck.sourcetype");
		deck.selectedIndex = index;
	},
	
	selectProtocolDeck : function(index) {
		var deck = document.getElementById("ec2ui.newpermission.deck.protocol");
		deck.selectedIndex = index;
	},
	
	init : function() {
		this.group = window.arguments[0];
		this.ec2ui_session = window.arguments[1];
		this.retVal = window.arguments[2];
		
		var groupTextBox = document.getElementById("ec2ui.newpermission.group");
		groupTextBox.value = this.group.name;
		
		this.selectSourceTypeDeck(0);
	}
}
