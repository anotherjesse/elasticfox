var ec2ui_credentialManager = {
	credentials : new Array,
	
	initDialog : function() {	
		document.getElementById("ec2ui.credentials.view").view = ec2ui_credentialsTreeView;
		this.credentials = this.loadCredentials();
		ec2ui_credentialsTreeView.setAccountCredentials(this.credentials);

		var lastAccountName = ec2ui_prefs.getLastUsedAccount();
		if (lastAccountName != null) {
			var index = this.indexOfAccountName(lastAccountName);
			ec2ui_credentialsTreeView.selectAccountName(index);
		}
	},

	indexOfAccountName : function(name) {
		for (var i = 0; i < this.credentials.length; i++) {
			if (this.credentials[i].name == name) {
				return i;
			}
		}
		return -1;
	},
	
	loadCredentials : function () {
		var host = "chrome://ec2ui/";
		var accountCredentials = new Array();
		var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
		
		var e = pwdManager.enumerator;
		while (e.hasMoreElements()) {
			try {
				// get an nsIPassword object out of the password manager.
				// This contains the actual password...
				var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
				if (pass.host == host) {
					var credentials = pass.password.split(";;");
					accountCredentials.push(new Credential(pass.user, credentials[0], credentials[1]));
				}
			} catch (ex) {
				// do something if decrypting the password failed--probably a continue
				alert(ex);
			}
		}

		return accountCredentials;
	},
	
	removeAccount : function() {
		var name = document.getElementById("ec2ui.credentials.account").value;
		if (trim(name) != "") {
			var index = this.indexOfAccountName(name);
			if (index != -1) {
				this.credentials.splice(index, 1);
			}

			var host = "chrome://ec2ui/";
			var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);

			if (pwdManager) 
			{
				try {
					pwdManager.removeUser(host, name);
				} catch (ex) {
					alert(ex);
				}
				
				ec2ui_credentialsTreeView.setAccountCredentials(this.credentials);
			}
		}
	},
	
	saveAccount : function() {
		var name = document.getElementById("ec2ui.credentials.account").value;

		var akid = document.getElementById("ec2ui.credentials.akid").value;
		var secretKey = document.getElementById("ec2ui.credentials.secretkey").value;

		if (name == null || name == "") return;
		if (akid == null || akid == "") return;
		if (secretKey == null || secretKey == "") return;

		var credentialStr =  akid + ";;" + secretKey;
		var index = this.indexOfAccountName(name);
		var cred = new Credential(name, akid, secretKey);
		if (index == -1) {
			this.credentials.push(cred);
		} else {
			this.credentials[i] = cred;
		}
		
		var host = "chrome://ec2ui/";
		var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);

		if (pwdManager) {
			if (index != -1) {
				try {
					pwdManager.removeUser(host, name);
				} catch (ex) {  
					alert(ex);
				}
			}
			pwdManager.addUser(host, name, credentialStr);
			
			ec2ui_credentialsTreeView.setAccountCredentials(this.credentials);
		}
	},
	
	packAccountNames : function(credentials) {
		var names = new Array();
		for (var i in credentials) {
			names.push(credentials[i].name);
		}
		return names.join(";;");
	},
	
	selectCredentials : function() {
		var sel = ec2ui_credentialsTreeView.getSelectedCredentials();
		if (sel != null) {
			document.getElementById("ec2ui.credentials.account").value = sel.name;
			document.getElementById("ec2ui.credentials.akid").value = sel.accessKey;
			document.getElementById("ec2ui.credentials.secretkey").value = sel.secretKey;
		}
	}
}
