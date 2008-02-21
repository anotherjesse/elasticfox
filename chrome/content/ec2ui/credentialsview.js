var ec2ui_credentialsTreeView = {
    treeBox: null,
    selection: null,
    credentials : new Array,

    get rowCount()                     { return this.credentials.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
	getCellText : function(idx, column) {
		if (idx >= this.rowCount) return "";
		return eval("this.credentials[idx]."+column.id.split(".").pop());
	},
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },
    getImageSrc: function(idx, column) { return "" ; },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
	cycleHeader: function(col) {
		cycleHeader(
			col, 
			document, 
			['credential.name','credential.accessKey'], 
			this.credentials);
	},
    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },
    
    setAccountCredentials : function(credentials) {
		this.treeBox.rowCountChanged(0, -this.credentials.length);
		// Clone the array to avoid aliasing preventing refreshes of the tree view
    	this.credentials = credentials.slice();
		this.treeBox.rowCountChanged(0, this.credentials.length);
    },

    selectAccountName : function(index) {
   		this.selection.select(index);
    },
    
    getSelectedCredentials : function() {
    	var index =  this.selection.currentIndex;
		if (index == -1) return null;
		return this.credentials[index];
    }
};
