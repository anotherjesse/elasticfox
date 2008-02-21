var ec2_InstanceLauncher = {
	image : null,
	ec2ui_session : null,
	retVal : null,
	unusedSecGroupsList : null,
	usedSecGroupsList : null,
	unused : new Array(),
	used : new Array(),

	launch : function() {
		if (!this.validateMin()) return false;
		if (!this.validateMax()) return false;
		
		this.retVal.ok = true;
		this.retVal.imageId = this.image.id;
		this.retVal.instanceType = document.getElementById("ec2ui.newinstances.instancetypelist").selectedItem.value;
		this.retVal.minCount = document.getElementById("ec2ui.newinstances.min").value;
		this.retVal.maxCount = document.getElementById("ec2ui.newinstances.max").value;
		// This will be null if <none> is selected
		this.retVal.keyName = document.getElementById("ec2ui.newinstances.keypairlist").selectedItem.value;
		this.retVal.securityGroups = this.used;
		this.retVal.userData = document.getElementById("ec2ui.newinstances.userdata").value;
		if (this.retVal.userData == "") {
			this.retVal.userData = null;
		}
		this.retVal.properties = document.getElementById("ec2ui.newinstances.properties").value;
		if (this.retVal.properties == "") {
			this.retVal.properties = null;
		}
		
		return true;
	},
	
	validateMin : function() {
		var textbox = document.getElementById("ec2ui.newinstances.min");
		var val = parseInt(textbox.value);
		if (val <= 0 || isNaN(val)) {
			alert("Minimum value must be a positive integer");
			textbox.select();
			return false;
		}
		return true;
	},

	validateMax : function() {
		// Assumes validateMin has been called
		var maxtextbox = document.getElementById("ec2ui.newinstances.max");
		var maxval = parseInt(maxtextbox.value);
		if (maxval <= 0 || isNaN(maxval)) {
			alert("Maximum value must be a positive integer");
			maxtextbox.select();
			return false;
		}
		var mintextbox = document.getElementById("ec2ui.newinstances.min");
		var minval = parseInt(mintextbox.value);
		if (minval > maxval) {
			alert("Maximum value may not be smaller than minimum value");
			maxtextbox.select();
			return false;
		}
		return true;
	},

	addSecurityGroup : function() {
		var sel = this.unusedSecGroupsList.selectedItems;
		for(var i in sel) {
			this.used.push(sel[i].label);
			this.unused.splice(i,1);
		}
		this.refreshDisplay();
	},
	
	removeSecurityGroup : function() {
		var sel = this.usedSecGroupsList.selectedItems;
		for(var i in sel) {
			this.unused.push(sel[i].label);
			this.used.splice(i,1);
		}
		this.refreshDisplay();
	},
	
	loadUserDataFromFile : function() {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Load user data", nsIFilePicker.modeLoad);
		fp.appendFilters(nsIFilePicker.filterAll);
		
		var res = fp.show();
		if (res == nsIFilePicker.returnOK){
			var userdataFile = fp.file;
			var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance( Components.interfaces.nsIFileInputStream );
			// Open the file for read (01)
			inputStream.init( userdataFile, 0x01, 0400, null );
			var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance( Components.interfaces.nsIScriptableInputStream );
			sis.init( inputStream );
			var contents = sis.read( sis.available() );
			inputStream.close();
			document.getElementById("ec2ui.newinstances.userdata").value = contents;
		}
	},
	
	init : function() {
		this.image = window.arguments[0];
		this.ec2ui_session = window.arguments[1];
		this.retVal = window.arguments[2];
		
		var typeMenu = document.getElementById("ec2ui.newinstances.instancetypelist");
	        // Nasty hard coding for the moment
		typeMenu.appendItem("m1.small", "m1.small");
		typeMenu.appendItem("m1.large", "m1.large");
		typeMenu.appendItem("m1.xlarge", "m1.xlarge");
		typeMenu.selectedIndex = 0;

		var amiTextBox = document.getElementById("ec2ui.newinstances.ami");
		amiTextBox.value = this.image.id;
		var minTextBox = document.getElementById("ec2ui.newinstances.min");
		minTextBox.focus();
		var keypairMenu = document.getElementById("ec2ui.newinstances.keypairlist");
		keypairMenu.appendItem("<none>", null);
		
		// Get the list of keypair names visible to this user. This will trigger a DescribeKeyPairs
		// if the model doesn't have any keypair info yet.
		var keypairs = this.ec2ui_session.model.getKeypairs();
		for(var i in keypairs) {
			keypairMenu.appendItem(keypairs[i].name, keypairs[i].name);
		}
		keypairMenu.selectedIndex = 0;

		// Grab handles to the unused and used security group lists.
		this.unusedSecGroupsList = document.getElementById("ec2ui.newinstances.secgroups.unused");
		this.usedSecGroupsList = document.getElementById("ec2ui.newinstances.secgroups.used");

		// Get the list of security groups visible to this user. This will trigger a DescribeSecurityGroups
		// if the model doesn't have any info yet.
		var securityGroups = this.ec2ui_session.model.getSecurityGroups();
		
		// Then add the default group to the used list. EC2 will do this anyway if no group is provided,
		// but this way it's obvious to the user what's happening.
		for(var i in securityGroups) {
			if (securityGroups[i].name == "default") {
				this.used.push(securityGroups[i].name);
			} else {
				this.unused.push(securityGroups[i].name);
			}
		}
		
		this.refreshDisplay();
	},
	
	refreshDisplay : function() {
		while(this.unusedSecGroupsList.getRowCount() > 0) { this.unusedSecGroupsList.removeItemAt(0); }
		while(this.usedSecGroupsList.getRowCount() > 0) { this.usedSecGroupsList.removeItemAt(0); }
	
		this.unused.sort();
		this.used.sort();

		for(var i in this.unused) { this.unusedSecGroupsList.appendItem(this.unused[i]); }
		for(var i in this.used) { this.usedSecGroupsList.appendItem(this.used[i]); }
	}
}
