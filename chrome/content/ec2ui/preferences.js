function WrappedMap(map, prefs) {
	this.map = map;

	this.get = function(key) {
		return this.map[key];
	};
	
	this.put = function(key, value) {
		this.map[key] = value;
		prefs.setAccountIdMap(this);
	};

	this.removeKey = function(key) {
		this.map[key] = null;
		prefs.setAccountIdMap(this);
	};

	this.toArray = function(block) {
		var list = new Array();
    	for (k in this.map) {
			if (typeof k === "function") {
				// Skip functions we add
				continue;
			}
			if (this.map.hasOwnProperty(k)) {
				v = this.map[k];
				if (v != null) {
		    		list.push(block(k, v));
				}
			}
		}
		return list;
	};

	this.toJSONString = function() {
		var pairs = new Array();
    	for (k in this.map) {
			if (typeof k === "function") {
				// Skip functions we add
				continue;
			}
			if (this.map.hasOwnProperty(k)) {
				v = this.map[k];
				if (v != null) {
					pairs.push("'"+k+"':'"+v+"'");
				}
			}
		}
		return "({"+pairs.join(',')+"})";
	};
}

var ec2ui_prefs = {
	LAST_USER_NAME		: "ec2ui.active.credentials.name",
	SSH_COMMAND             : "ec2ui.tools.ssh.command",
	SSH_ARGS                : "ec2ui.tools.ssh.args",
	SSH_KEY                 : "ec2ui.tools.ssh.key",
	SSH_USER                : "ec2ui.tools.ssh.user",
	DEBUG_ENABLED		: "ec2ui.debugging.enabled",
	OFFLINE				: "ec2ui.offline.enabled",
	QUERY_ON_START		: "ec2ui.queryonstart.enabled",
	REFRESH_ON_CHANGE	: "ec2ui.refreshonchange.enabled",
	AUTOFETCH_LP		: "ec2ui.autofetchlaunchpermissions.enabled",
	OPEN_IN_NEW_TAB		: "ec2ui.usenewtab.enabled",
	EC2_URL				: "ec2ui.url",
	REQUEST_TIMEOUT		: "ec2ui.timeout.request",
	KNOWN_ACCOUNT_IDS	: "ec2ui.known.account.ids",

	prefs : null,
	
	init : function() {
		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch );
		// Read and write back our preferences. This ensures that if they're not yet set
		// they're set to our defaults.
		this.setLastUsedAccount(this.getLastUsedAccount());
		this.setSSHCommand(this.getSSHCommand());
		this.setSSHArgs(this.getSSHArgs());
		this.setSSHKeyTemplate(this.getSSHKeyTemplate());
		this.setSSHUser(this.getSSHUser());
		this.setRequestTimeout(this.getRequestTimeout());
		this.setServiceURL(this.getServiceURL());
		this.setDebugEnabled(this.isDebugEnabled());
		this.setOfflineEnabled(this.isOfflineEnabled());
		this.setOpenInNewTabEnabled(this.isOpenInNewTabEnabled());
		this.setQueryOnStartEnabled(this.isQueryOnStartEnabled());
		this.setRefreshOnChangeEnabled(this.isRefreshOnChangeEnabled());
		this.setAutoFetchLaunchPermissionsEnabled(this.isAutoFetchLaunchPermissionsEnabled());
		this.setAccountIdMap(this.getAccountIdMap());
	},
	
	setLastUsedAccount : function(value) { this.saveStringPreference(this.LAST_USER_NAME, value); },
	setSSHCommand : function(value) { this.saveStringPreference(this.SSH_COMMAND, value); },
	setSSHArgs : function(value) { this.saveStringPreference(this.SSH_ARGS, value); },
	setSSHKeyTemplate : function(value) { this.saveStringPreference(this.SSH_KEY, value); },
	setSSHUser : function(value) { this.saveStringPreference(this.SSH_USER, value); },
	setRequestTimeout : function(value) { this.saveIntPreference(this.REQUEST_TIMEOUT, value); },
	setServiceURL : function(value) { this.saveStringPreference(this.EC2_URL, value); },
	setDebugEnabled : function(enabled) { this.saveBoolPreference(this.DEBUG_ENABLED, enabled); },
	setOfflineEnabled : function(enabled) { this.saveBoolPreference(this.OFFLINE, enabled); },
	setOpenInNewTabEnabled : function(enabled) { this.saveBoolPreference(this.OPEN_IN_NEW_TAB, enabled); },
	setQueryOnStartEnabled : function(enabled) { this.saveBoolPreference(this.QUERY_ON_START, enabled); },
	setRefreshOnChangeEnabled : function(enabled) { this.saveBoolPreference(this.REFRESH_ON_CHANGE, enabled); },
	setAutoFetchLaunchPermissionsEnabled : function(enabled) { this.saveBoolPreference(this.AUTOFETCH_LP, enabled); },

	getLastUsedAccount : function() { return this.getStringPreference(this.LAST_USER_NAME, ""); },
	getSSHCommand : function() { return this.getStringPreference(this.SSH_COMMAND, "/usr/bin/gnome-terminal"); },
	getSSHArgs : function() { return this.getStringPreference(this.SSH_ARGS, "-x /usr/bin/ssh -i ${key} ${user}@${host}"); },
	getSSHKeyTemplate : function() { return this.getStringPreference(this.SSH_KEY, "${home}/ec2-keys/id_${keyname}"); },
	getSSHUser : function() { return this.getStringPreference(this.SSH_USER, "root"); },
	getRequestTimeout : function() { return this.getIntPreference(this.REQUEST_TIMEOUT, 15000); },
	getServiceURL : function() { return this.getStringPreference(this.EC2_URL, "https://ec2.amazonaws.com"); },
	isDebugEnabled : function() { return this.getBoolPreference(this.DEBUG_ENABLED, false); },
	isOfflineEnabled : function() { return this.getBoolPreference(this.OFFLINE, false); },
	isOpenInNewTabEnabled : function() { return this.getBoolPreference(this.OPEN_IN_NEW_TAB, false); },
	isQueryOnStartEnabled : function() { return this.getBoolPreference(this.QUERY_ON_START, true); },
	isRefreshOnChangeEnabled : function() { return this.getBoolPreference(this.REFRESH_ON_CHANGE, true); },
	isAutoFetchLaunchPermissionsEnabled : function() { return this.getBoolPreference(this.AUTOFETCH_LP, false); },

	// These ones manage a pseudo-complex pref. This preference is a JSON encoded JavaScript "map"
	// mapping account IDs to friendly names.
	setAccountIdMap : function(value) { this.saveStringPreference(this.KNOWN_ACCOUNT_IDS, value.toJSONString()); },
	getAccountIdMap : function() { 
		var packedMap = this.getStringPreference(this.KNOWN_ACCOUNT_IDS, null);
		if (packedMap == null) {
			return new WrappedMap({}, this);
		}
		// Unpack the map and return it
		var unpackedMap = eval(packedMap);
		
		return new WrappedMap(unpackedMap, this);
	},
	
	getStringPreference : function(name, defValue) {
		if (!this.prefs.prefHasUserValue(name)) {
			return defValue;
		}
		if (this.prefs.getPrefType(name) != this.prefs.PREF_STRING) {
			return defValue;
		}
		
		return this.prefs.getCharPref(name).toString();
	},
              
	getIntPreference : function(name, defValue) {
		if (!this.prefs.prefHasUserValue(name)) {
			return defValue;
		}
		if (this.prefs.getPrefType(name) != this.prefs.PREF_INT) {
			return defValue;
		}
		
		return this.prefs.getIntPref(name);
	},
              
	getBoolPreference : function(name, defValue) {
		if (!this.prefs.prefHasUserValue(name)) {
			return defValue;
		}
		if (this.prefs.getPrefType(name) != this.prefs.PREF_BOOL) {
			return defValue;
		}
		
		return this.prefs.getBoolPref(name);
	},
	
	saveStringPreference : function(name, value) {
		this.prefs.setCharPref(name, value);
	},
	
	saveIntPreference : function(name, value) {
		this.prefs.setIntPref(name, value);
	},
	
	saveBoolPreference : function(name, value) {
		this.prefs.setBoolPref(name, value);
    }
}

