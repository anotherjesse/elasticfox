var ec2ui_KeypairTreeView = {
	COLNAMES : ['keypair.name','keypair.fingerprint'],
	treeBox : null,
	selection : null,
	arrLocalFiles : new Array,
	keypairList : new Array(),
	registered : false,

	get rowCount() { return this.keypairList.length; },

	setTree     : function(treeBox)         { this.treeBox = treeBox; },
	getCellText : function(idx, column) {
		if (idx >= this.rowCount) return "";
		return eval("this.keypairList[idx]."+column.id.split(".").pop());
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
			this.keypairList);
	},
	
	viewDetails : function(event) {
		var keypair = this.getSelectedKeyPair();
		if (keypair == null) return;
		window.openDialog("chrome://ec2ui/content/dialog_keypair_details.xul", null, "chrome,centerscreen,modal", keypair);
	},

	sort : function() {
		sortView(document, this.COLNAMES, this.keypairList);
	},

	selectionChanged: function() {},
	cycleCell: function(idx, column) {},
	performAction: function(action) {},
	performActionOnCell: function(action, index, column) {},
	getRowProperties: function(idx, column, prop) {},
	getCellProperties: function(idx, column, prop) {},
	getColumnProperties: function(column, element, prop) {},
	getLevel : function(idx) { return 0; },

	notifyModelInvalidated : function() {
		this.displayKeypairs(new Array());
	},
	
	refresh	: function() {
		if (!this.registered) {
			this.registered = true;
			ec2ui_model.register(this);
		}
		
		var me = this;
		var wrap = function(x) { me.displayKeypairs(x); }
		ec2ui_session.controller.describeKeypairs(wrap);
	},
	
	selectByName	: function(name) {
		this.selection.clearSelection();
		for(var i in this.keypairList) {
			if (this.keypairList[i].name == name) {
				this.selection.select(i);
				return;
			}
		}
		
		// In case we don't find a match (which is probably a bug).
		this.selection.select(0);
	},
	
	createKeypair : function () {
		var name = prompt("Please provide a new keypair name");
		if (name == null)
			return;
		var me = this;
		var wrap = function(name, key) { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.saveKeypair(name, key);
				me.refresh();
				me.selectByName(name);
			}
		}
		ec2ui_session.controller.createKeypair(name, wrap);
	},
	
	saveKeypair : function (name, key) {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Save new private key", nsIFilePicker.modeSave);
		fp.appendFilter("PEM Files","*.pem");
		fp.appendFilters(nsIFilePicker.filterAll);
		//fp.displayDirectory(nsILocalFile instance);
		fp.defaultString = name+".pem";
		
		var res = fp.show();
		if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace ){
			var keyFile = fp.file;
			// Create a file that's readable/writeable by the user only
			if (keyFile.exists() == false) {
				keyFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0600);
			}
			
			var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
			// Open the file for read+write (04), creating it if necessary (08), and truncating it if it exists (20)
			outputStream.init( keyFile, 0x04 | 0x08 | 0x20, 0600, 0 );
			var result = outputStream.write( key, key.length );
			outputStream.close();
		}

		this.refresh();
	},
	
	getSelectedKeyPair : function() {
		var index =  this.selection.currentIndex;
		if (index == -1) return null;
		return this.keypairList[this.selection.currentIndex];
	},
	
	deleteSelected  : function () {
		var keypair = this.getSelectedKeyPair();
		if (keypair == null) return;
		var confirmed = confirm("Delete key pair "+keypair.name+"?");
		if (!confirmed)
			return;
	   
		var me = this;
		var wrap = function() { 
			if (ec2ui_prefs.isRefreshOnChangeEnabled()) { 
				me.refresh(); 
			}
		}
		ec2ui_session.controller.deleteKeypair(keypair.name, wrap);
	},

	displayKeypairs : function (keypairList) {
		this.treeBox.rowCountChanged(0, -this.keypairList.length);
		this.keypairList = keypairList;
		this.treeBox.rowCountChanged(0, this.keypairList.length);
		this.sort();
		this.selection.clearSelection();
		if (keypairList.length > 0) {
			this.selection.select(0);
		}
	}
};

