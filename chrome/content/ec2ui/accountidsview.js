var ec2ui_accountIdsTreeView = {
    treeBox: null,
    selection: null,
    accountidlist : new Array,

    get rowCount()                     { return this.accountidlist.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
	getCellText : function(idx, column) {
		if (idx >= this.rowCount) return "";
		return eval("this.accountidlist[idx]."+column.id.split(".").pop());
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
			['accountids.accountid','accountids.displayname'], 
			this.accountidlist);
	},
    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },
    
    setMapping : function(mapping) {
    	var b = -this.accountidlist.length;
		this.treeBox.rowCountChanged(0, -this.accountidlist.length);
		// Unpack the map into an array for display purposes
    	this.accountidlist = mapping.toArray(function(k,v){return new AccountIdName(k, v)});
    	var a = this.accountidlist.length;
		this.treeBox.rowCountChanged(0, this.accountidlist.length);
    },

    selectAccountName : function(index) {
   		this.selection.select(index);
    },
    
    getSelectedEntry : function() {
    	var index =  this.selection.currentIndex;
		if (index == -1) return null;
		return this.accountidlist[index];
    }
};
