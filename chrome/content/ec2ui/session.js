//main object that holds the current session information
var ec2ui_session =
{
	accessCode      : "",
	secretKey       : "",
	initialized		: false,
	controller		: null,
	model				: null,
	keypairTreeView 			: null,
	securityGroupTreeView 	: null,
	credentials		: null,
	accountidmap	: null,

	initialize : function () {
		if (!this.initialized) {
			ec2ui_prefs.init()

			document.getElementById("ec2ui.images.view").view = ec2ui_AMITreeView;
			document.getElementById("ec2ui.keypairs.view").view = ec2ui_KeypairTreeView;
			document.getElementById("ec2ui.instances.view").view = ec2ui_InstancesTreeView;
			document.getElementById("ec2ui.security.groups.view").view = ec2ui_SecurityGroupsTreeView;
			document.getElementById("ec2ui.permissions.view").view = ec2ui_PermissionsTreeView;
			
			this.controller = ec2ui_controller;
			this.model = ec2ui_model;
			this.keypairTreeView = ec2ui_KeypairTreeView;
			this.securityGroupTreeView = ec2ui_SecurityGroupsTreeView;

			this.loadCredentials();
			this.switchCredentials();
			this.loadAccountIdMap();
			
			if("@maone.net/noscript-service;1" in Components.classes) {
				(Components.classes ["@maone.net/noscript-service;1"].getService().wrappedJSObject).setJSEnabled("about:blank", true);
			}
			
			if (ec2ui_prefs.isQueryOnStartEnabled()) {
				ec2ui_AMITreeView.refresh();
				ec2ui_InstancesTreeView.refresh();
			}
		}
		this.initialized = true;
	},
    
	loadCredentials : function () {
		var activeCredsMenu = document.getElementById("ec2ui.active.credentials.list");
		activeCredsMenu.removeAllItems();
		
		var lastUsedCred = ec2ui_prefs.getLastUsedAccount();
		
		this.credentials = ec2ui_credentialManager.loadCredentials();
		for(var i in this.credentials) {
			activeCredsMenu.insertItemAt(i, this.credentials[i].name, this.credentials[i].name, "");
			if (lastUsedCred == this.credentials[i].name) {
				activeCredsMenu.selectedIndex = i;
			}
		}
    },
    
    switchCredentials : function () {
    	var activeCredsMenu = document.getElementById("ec2ui.active.credentials.list");
    	
		if (this.credentials != null && this.credentials.length > 0) {
			if (activeCredsMenu.selectedIndex == -1) {
				activeCredsMenu.selectedIndex = 0;
			}
			
			if (activeCredsMenu.selectedIndex != -1) {
				var activeCred = this.credentials[activeCredsMenu.selectedIndex];
				ec2ui_prefs.setLastUsedAccount(activeCred.name);
				ec2_httpclient.setCredentials(activeCred.accessKey, activeCred.secretKey);
				this.model.invalidate();
			}
		} else {
			this.setLastUsedAccount(activeCred.name, "");
		}
	},
        
	manageCredentials : function () {
		window.openDialog("chrome://ec2ui/content/dialog_manage_credentials.xul", null, "chrome,centerscreen,modal");
		this.loadCredentials();
		this.switchCredentials();
	},

	manageTools : function () {
		window.openDialog("chrome://ec2ui/content/dialog_manage_tools.xul", null, "chrome,centerscreen,modal");
	},
   
	loadAccountIdMap : function () {
		this.accountidmap = ec2ui_prefs.getAccountIdMap();
	},
	
	manageAccountIds : function () {
		window.openDialog("chrome://ec2ui/content/dialog_manage_accountids.xul", null, "chrome,centerscreen,modal", this.accountidmap);
		this.loadAccountIdMap();
	},
	
	lookupAccountId : function(id) {
		if (this.accountidmap == null) {
		   return id;
		}
		if (this.accountidmap.get(id) == null) {
		   return id;
		}
		return this.accountidmap.get(id);
	},
   
	displayAbout : function () {
		window.openDialog("chrome://ec2ui/content/dialog_about.xul", null, "chrome,centerscreen,modal", ec2ui_session);
	},
    
	openURL : function(url) {
		window.open(url, "_new");
	},
   
	openMainWindow: function () {
		var url = "chrome://ec2ui/content/ec2ui_main_window.xul";
		ec2ui_prefs.init()
		if (ec2ui_prefs.isOpenInNewTabEnabled()) {
			getBrowser().selectedTab = getBrowser().addTab(url);
		} else {
			getBrowser().selectedBrowser.contentDocument.location = url;
		}
	}
};

