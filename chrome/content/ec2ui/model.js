// "Classes" representing objects like AMIs, Instances etc.
function Credential(name, accessKey, secretKey) {
   this.name = name;
   this.accessKey = accessKey;
   this.secretKey = secretKey;
}

function AccountIdName(id, name) {
   this.accountid = id;
   this.displayname = name;
}

function AMI(imageId, location, state, owner, isPublic) {
   this.id = imageId;
   this.location = location;
   this.state = state;
   this.owner = owner;
   this.isPublic = isPublic;
}

function Instance(resId, ownerId, groupList, instanceId, imageId, state, publicDnsName, privateDnsName, keyName, reason, amiLaunchIdx, instanceType, launchTime) {
   this.resId = resId;
   this.ownerId = ownerId;
   this.groupList = groupList;
   this.id = instanceId;
   this.imageId = imageId;
   this.state = state;
   this.publicDnsName = publicDnsName;
   this.privateDnsName = privateDnsName;
   this.keyName = keyName;
   this.reason = reason;
   this.amiLaunchIdx = amiLaunchIdx;
   this.instanceType = instanceType;
   this.launchTime = launchTime;
   this.launchTimeDisp = launchTime.strftime('%Y-%m-%d %H:%M:%S');
   
   this.groups = this.groupList.join(', ');
}

function KeyPair(name, fingerprint) {
   this.name = name;
   this.fingerprint = fingerprint;
}

function SecurityGroup(ownerId, name, description, permissions) {
	this.ownerId = ownerId;
	this.name = name;
	this.description = description;
	this.permissions = permissions;
}

function Permission(protocol, fromPort, toPort, groupTuples, ipRanges) {
	this.protocol = protocol;
	this.fromPort = fromPort;
	this.toPort = toPort;
	this.groupTuples = groupTuples;	// userId+groupName tuples
	this.ipRanges = ipRanges;			// CIDRs
	
	var tuples = new Array();
	for(var i in this.groupTuples) {
		tuples.push(this.groupTuples[i].join(':'));
	}
	this.groups = tuples.join(', ');
	this.cidrs = this.ipRanges.join(', ');
}

// Global model: home to things like lists of data that need to be shared (known AMIs, keypairs etc)
var ec2ui_model = {
	components			: new Array(),
	images				: new Array(),
	instances			: new Array(),
	keypairs 			: null,
	securityGroups 	: null,
	
	invalidate : function() {
		this.images = new Array();
		this.instances = new Array();
		this.keypairs = null;
		this.securityGroups = null;
		for(var i in this.components) {
			this.components[i].notifyModelInvalidated();
		}
	},
	
	register : function(component) {
		this.components.push(component);
	},
	
	updateImages : function(list) {
		this.images = list;
	},
	
	updateInstances : function(list) {
		this.instances = list;
	},
	
	updateKeypairs : function(list) {
		this.keypairs = list;
	},

	getKeypairs : function() {
		if (this.keypairs == null) {
			var me = ec2ui_session.keypairTreeView;
			var wrap = function(x) { me.displayKeypairs(x); }
			ec2ui_session.controller.describeKeypairs(wrap);
		}
		return this.keypairs;
	},

	updateSecurityGroups : function(list) {
		this.securityGroups = list;
	},

	getSecurityGroups : function() {
		if (this.securityGroups == null) {
			var me = ec2ui_session.securityGroupTreeView;
			var wrap = function(x) { me.displayGroups(x); }
			ec2ui_session.controller.describeSecurityGroups(wrap);
		}
		return this.securityGroups;
	}
}
