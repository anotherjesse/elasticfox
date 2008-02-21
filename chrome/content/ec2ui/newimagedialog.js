var ec2_ImageRegistrar = {
	ec2ui_session : null,
	retVal : null,

	getTextBox : function() {
		return document.getElementById("ec2ui.newimage.manifest");
	},
	
	registerImage : function() {
		if (!this.validateManifest()) return false;
		this.retVal.manifestPath = this.getTextBox().value;
		this.retVal.ok = true;
		return true;
	},
	
	validateManifest : function() {
		var textbox = this.getTextBox();
		if (textbox.value == "") {
			alert("Please provide a path to an image manifest file");
			textbox.select();
			return false;
		}
		var oldextre = new RegExp("\\.manifest$");
		var newextre = new RegExp("\\.manifest\\.xml$");
		if (textbox.value.match(oldextre) == null && textbox.value.match(newextre) == null) {
			alert("Manifest files should end in .manifest or .manifest.xml");
			textbox.select();
			return false;
		}
		var httppre = new RegExp("^http", "i");
		if (textbox.value.match(httppre) != null) {
			alert("Just specify the bucket and manifest path name, not the entire S3 URL.");
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
