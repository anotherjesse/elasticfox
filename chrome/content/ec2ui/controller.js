// controller: slightly higher level of abstraction over the EC2 API
var ec2ui_controller = {
	getNsResolver : function() {
		return ec2_httpclient.getNsResolver();
	},

	registerImage : function (manifestPath, callback) {
		ec2_httpclient.queryEC2("RegisterImage", [["ImageLocation", manifestPath]], this, true, "onCompleteRegisterImage", callback);
	},
		
	onCompleteRegisterImage : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;
		var imageId = xmlDoc.getElementsByTagName("imageId")[0].firstChild.nodeValue;
		
		if (objResponse.callback)
			objResponse.callback(imageId);
	},
		
	deregisterImage : function (imageId, callback) {
		ec2_httpclient.queryEC2("DeregisterImage", [["ImageId", imageId]], this, true, "onCompleteDeregisterImage", callback);
	},
		
	onCompleteDeregisterImage : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},
		
	describeImages : function (callback) {
		ec2_httpclient.queryEC2("DescribeImages", [], this, true, "onCompleteDescribeImages", callback);
	},
		
	onCompleteDescribeImages : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;

		var list = new Array();
		var items = xmlDoc.evaluate("/ec2:DescribeImagesResponse/ec2:imagesSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for(var i=0 ; i < items.snapshotLength; i++) {
			var imageId = items.snapshotItem(i).getElementsByTagName("imageId")[0].firstChild.nodeValue;
			var imageLocation = items.snapshotItem(i).getElementsByTagName("imageLocation")[0].firstChild.nodeValue;
			var imageState = items.snapshotItem(i).getElementsByTagName("imageState")[0].firstChild.nodeValue;
			var owner = items.snapshotItem(i).getElementsByTagName("imageOwnerId")[0].firstChild.nodeValue;
			var isPublic = items.snapshotItem(i).getElementsByTagName("isPublic")[0].firstChild.nodeValue;
			list.push(new AMI(imageId, imageLocation, imageState, owner, (isPublic == 'true' ? 'public' : 'private')));
		}
		
		ec2ui_model.updateImages(list);
		if (objResponse.callback)
			objResponse.callback(list);
	},
		
	describeLaunchPermissions : function (imageId, callback) {
		ec2_httpclient.queryEC2("DescribeImageAttribute", [["ImageId", imageId], ["Attribute","launchPermission"]], this, true, "onCompleteDescribeLaunchPermissions", callback);
	},

	onCompleteDescribeLaunchPermissions : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;

		var list = new Array();
		var items = xmlDoc.getElementsByTagName("item");
		for (var i = 0; i < items.length; i++) {
			if (items[i].getElementsByTagName("group")[0]) {
				list.push(items[i].getElementsByTagName("group")[0].firstChild.nodeValue);
			}
			if (items[i].getElementsByTagName("userId")[0]) {
				list.push(items[i].getElementsByTagName("userId")[0].firstChild.nodeValue);
			}
		}

		if (objResponse.callback)
			objResponse.callback(list);
	},
		
	addLaunchPermission : function (imageId, name, callback) {
		params = []
		params.push(["ImageId", imageId]);
		params.push(["Attribute","launchPermission"]);
		params.push(["OperationType", "add"]);
		if (name == "all") {
			params.push(["UserGroup.1", name]);
		} else {
			params.push(["UserId.1", name]);
		}
		ec2_httpclient.queryEC2("ModifyImageAttribute", params, this, true, "onCompleteModifyImageAttribute", callback);
	},
		
	revokeLaunchPermission : function (imageId, name, callback) {
		params = []
		params.push(["ImageId", imageId]);
		params.push(["Attribute","launchPermission"]);
		params.push(["OperationType", "remove"]);
		if (name == "all") {
			params.push(["UserGroup.1", name]);
		} else {
			params.push(["UserId.1", name]);
		}
		ec2_httpclient.queryEC2("ModifyImageAttribute", params, this, true, "onCompleteModifyImageAttribute", callback);
	},
		
	onCompleteModifyImageAttribute : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},
		
	resetLaunchPermissions : function (imageId, callback) {
		params = []
		params.push(["ImageId", imageId]);
		params.push(["Attribute","launchPermission"]);
		ec2_httpclient.queryEC2("ResetImageAttribute", params, this, true, "onCompleteResetImageAttribute", callback);
	},
		
	onCompleteResetImageAttribute : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},
		 
	unpackReservationInstances : function (resId, ownerId, groups, instanceItems) {
		var list = new Array();
		for (var j = 0; j < instanceItems.length; j++) {
		    if (instanceItems[j].nodeName == '#text') continue;
		    
		    var instanceId = instanceItems[j].getElementsByTagName("instanceId")[0].firstChild.nodeValue;
		    var imageId = instanceItems[j].getElementsByTagName("imageId")[0].firstChild.nodeValue;
		    var instanceState = instanceItems[j].getElementsByTagName("instanceState")[0];
		    var stateName = instanceState.getElementsByTagName("name")[0].firstChild.nodeValue;
		    var dnsName = getNodeValueByName(instanceItems[j], "dnsName");
		    var privateDnsName = getNodeValueByName(instanceItems[j], "privateDnsName");
		    var keyName = getNodeValueByName(instanceItems[j], "keyName");
		    var reason = getNodeValueByName(instanceItems[j], "reason");
		    var amiLaunchIdx = getNodeValueByName(instanceItems[j], "amiLaunchIndex");
		    var instanceType = getNodeValueByName(instanceItems[j], "instanceType");
		    var launchTime = new Date();
		    launchTime.setISO8601(getNodeValueByName(instanceItems[j], "launchTime"));
		    list.push(new Instance(
		       resId, 
		       ownerId, 
		       groups, 
		       instanceId, 
		       imageId, 
		       stateName, 
		       dnsName, 
		       privateDnsName, 
		       keyName, 
		       reason, 
		       amiLaunchIdx,
		       instanceType,
		       launchTime));
		}
		return list;
	},

	runInstances : function (imageId, minCount, maxCount, keyName, securityGroups, userData, properties, instanceType, callback) {
		params = []
		params.push(["ImageId", imageId]);
		params.push(["InstanceType", instanceType]);
		params.push(["MinCount", minCount]);
		params.push(["MaxCount", maxCount]);
		if (keyName != null && keyName != "") {
			params.push(["KeyName", keyName]);
		}
		for(var i in securityGroups) {
			params.push(["SecurityGroup."+(i+1), securityGroups[i]]);
		}
		if (userData != null) {
			params.push(["UserData", Base64.encode(userData)]);
		}
		if (properties != null) {
			params.push(["AdditionalInfo", properties]);
		}
		ec2_httpclient.queryEC2("RunInstances", params, this, true, "onCompleteRunInstances", callback);
	},

	onCompleteRunInstances : function (objResponse) {
	   var xmlDoc = objResponse.xmlDoc;
	   
	   var list = new Array();
	   var items = xmlDoc.evaluate("/", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	   for(var i=0 ; i < items.snapshotLength; i++) {
	      var resId = items.snapshotItem(i).getElementsByTagName("reservationId")[0].firstChild.nodeValue;
	      var ownerId = items.snapshotItem(i).getElementsByTagName("ownerId")[0].firstChild.nodeValue;
	      var groups = new Array();
	      var groupIds = items.snapshotItem(i).getElementsByTagName("groupId");
	      for (var j = 0; j < groupIds.length; j++) {
		 groups.push(groupIds[j].firstChild.nodeValue);
	      }
	      
	      var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
	      var instanceItems = instancesSet.childNodes;
	      
	      if (instanceItems) {
		 var resList = this.unpackReservationInstances(resId, ownerId, groups, instanceItems);
		 for (var j = 0; j < resList.length; j++) {
		    list.push(resList[j]);
		 }
	      }
	   }
	   
	   if (objResponse.callback)
	      objResponse.callback(list);
	},
		
	terminateInstances : function (instanceIds, callback) {
		params = []
		for(var i in instanceIds) {
			params.push(["InstanceId."+(i+1), instanceIds[i]]);
		}
		ec2_httpclient.queryEC2("TerminateInstances", params, this, true, "onCompleteTerminateInstances", callback);
	},
		
	onCompleteTerminateInstances : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;

		var list = new Array();
		var items = xmlDoc.evaluate("/", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for(var i=0 ; i < items.snapshotLength; i++) {
			var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
			var instanceItems = instancesSet.getElementsByTagName("item");
			for (var j = 0; j < instanceItems.length; j++) {
				var instanceId = instanceItems[j].getElementsByTagName("instanceId")[0].firstChild.nodeValue;
				list.push({id:instanceId});
			}
		}

		if (objResponse.callback)
			objResponse.callback(list);
	},
		
	describeInstances : function (callback) {
		ec2_httpclient.queryEC2("DescribeInstances", [], this, true, "onCompleteDescribeInstances", callback);
	},

	onCompleteDescribeInstances : function (objResponse) {
	   var xmlDoc = objResponse.xmlDoc;
	   
	   var list = new Array();
	   var items = xmlDoc.evaluate("/ec2:DescribeInstancesResponse/ec2:reservationSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	   for(var i=0 ; i < items.snapshotLength; i++) {
	      var resId = items.snapshotItem(i).getElementsByTagName("reservationId")[0].firstChild.nodeValue;
	      var ownerId = items.snapshotItem(i).getElementsByTagName("ownerId")[0].firstChild.nodeValue;
	      var groups = new Array();
	      var groupIds = items.snapshotItem(i).getElementsByTagName("groupId");
	      for (var j = 0; j < groupIds.length; j++) {
		 groups.push(groupIds[j].firstChild.nodeValue);
	      }
	      var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
	      var instanceItems = instancesSet.childNodes;
	      
	      if (instanceItems) {
		 var resList = this.unpackReservationInstances(resId, ownerId, groups, instanceItems);
		 for (var j = 0; j < resList.length; j++) {
		    list.push(resList[j]);
		 }
	      }
	   }
	   
	   ec2ui_model.updateInstances(list);
	   if (objResponse.callback)
	      objResponse.callback(list);
	},
		
	describeKeypairs : function (callback) {
		ec2_httpclient.queryEC2("DescribeKeyPairs", [], this, true, "onCompleteDescribeKeypairs", callback);
	},
		
	onCompleteDescribeKeypairs : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;

		var list = new Array();
		var items = xmlDoc.getElementsByTagName("item");
		for (var i = 0; i < items.length; i++)
		{	
			var name = items[i].getElementsByTagName("keyName")[0].firstChild.nodeValue;
			var fp = items[i].getElementsByTagName("keyFingerprint")[0].firstChild.nodeValue;
			list.push(new KeyPair(name, fp));
		}
		
		ec2ui_model.updateKeypairs(list);
		if (objResponse.callback)
			objResponse.callback(list);
	},

	describeSecurityGroups : function (callback) {
		ec2_httpclient.queryEC2("DescribeSecurityGroups", [], this, true, "onCompleteDescribeSecurityGroups", callback);
	},

	onCompleteDescribeSecurityGroups : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;

		var list = new Array();
		var items = xmlDoc.evaluate("/ec2:DescribeSecurityGroupsResponse/ec2:securityGroupInfo/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for(var i = 0 ; i < items.snapshotLength; i++) {
			var ownerId = items.snapshotItem(i).getElementsByTagName("ownerId")[0].firstChild.nodeValue;
			var groupName = items.snapshotItem(i).getElementsByTagName("groupName")[0].firstChild.nodeValue;
			var groupDescription = items.snapshotItem(i).getElementsByTagName("groupDescription")[0].firstChild;
      if (groupDescription) {
        groupDescription = groupDescription.nodeValue;
      }
			log("Group name ["+groupName+"]");
			
			var ipPermissionsList = new Array();
			var ipPermissions = items.snapshotItem(i).getElementsByTagName("ipPermissions")[0];
			var ipPermissionsItems = ipPermissions.childNodes;
			if (ipPermissionsItems) {
				for (var j = 0; j < ipPermissionsItems.length; j++) {
					if (ipPermissionsItems.item(j).nodeName == '#text') continue;
					var ipProtocol = ipPermissionsItems.item(j).getElementsByTagName("ipProtocol")[0].firstChild.nodeValue;
					var fromPort = ipPermissionsItems.item(j).getElementsByTagName("fromPort")[0].firstChild.nodeValue;
					var toPort = ipPermissionsItems.item(j).getElementsByTagName("toPort")[0].firstChild.nodeValue;
					log("Group ipp ["+ipProtocol+":"+fromPort+"-"+toPort+"]");
	
					var groupTuples = new Array();
					var groups = ipPermissionsItems[j].getElementsByTagName("groups")[0];
					if (groups) {
						var groupsItems = groups.childNodes;
						for (var k = 0; k < groupsItems.length; k++) {
							if (groupsItems.item(k).nodeName == '#text') continue;
							var userId = groupsItems[k].getElementsByTagName("userId")[0].firstChild.nodeValue;
							var srcGroupName = groupsItems[k].getElementsByTagName("groupName")[0].firstChild.nodeValue;
							groupTuples.push([userId, srcGroupName]);
							ipPermissionsList.push(new Permission(ipProtocol, fromPort, toPort, [[userId, srcGroupName]], []));
						}
					}
	
					var cidrList = new Array();
					var ipRanges = ipPermissionsItems[j].getElementsByTagName("ipRanges")[0];
					if (ipRanges) {
						var ipRangesItems = ipRanges.childNodes;
						for (var k = 0; k < ipRangesItems.length; k++) {
							if (ipRangesItems.item(k).nodeName == '#text') continue;
							var cidrIp = ipRangesItems[k].getElementsByTagName("cidrIp")[0].firstChild.nodeValue;
							cidrList.push(cidrIp);
							ipPermissionsList.push(new Permission(ipProtocol, fromPort, toPort, [], [cidrIp]));
						}
					}
					//ipPermissionsList.push(new Permission(ipProtocol, fromPort, toPort, groupTuples, cidrList));
				}
			}
			
			list.push(new SecurityGroup(ownerId, groupName, groupDescription, ipPermissionsList));
		}

		ec2ui_model.updateSecurityGroups(list);
		if (objResponse.callback)
			objResponse.callback(list);
	},
		
	createKeypair : function (name, callback) {
		ec2_httpclient.queryEC2("CreateKeyPair", [["KeyName", name]], this, true, "onCompleteCreateKeyPair", callback);
	},
		
	onCompleteCreateKeyPair : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;

		var name = xmlDoc.getElementsByTagName("keyName")[0].firstChild.nodeValue;
		var fp = xmlDoc.getElementsByTagName("keyFingerprint")[0].firstChild.nodeValue;
		var keyMaterial = xmlDoc.getElementsByTagName("keyMaterial")[0].firstChild.nodeValue;
		
		// I'm lazy, so for now the caller will just have to call describeKeypairs again to see
		// the new keypair.
		
		if (objResponse.callback)
			objResponse.callback(name, keyMaterial);
	},

	deleteKeypair : function (name, callback) {
		ec2_httpclient.queryEC2("DeleteKeyPair", [["KeyName", name]], this, true, "onCompleteDeleteKeyPair", callback);
	},
		
	onCompleteDeleteKeyPair : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},
		
	createSecurityGroup : function (name, desc, callback) {
		ec2_httpclient.queryEC2("CreateSecurityGroup", [["GroupName", name], ["GroupDescription", desc]], this, true, "onCompleteCreateSecurityGroup", callback);
	},
		
	onCompleteCreateSecurityGroup : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},

	deleteSecurityGroup : function (name, callback) {
		ec2_httpclient.queryEC2("DeleteSecurityGroup", [["GroupName", name]], this, true, "onCompleteDeleteSecurityGroup", callback);
	},
		
	onCompleteDeleteSecurityGroup : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},

	authorizeSourceCIDR : function (groupName, ipProtocol, fromPort, toPort, cidrIp, callback) {
		params = []
		params.push(["GroupName", groupName]);
		params.push(["IpProtocol", ipProtocol]);
		params.push(["FromPort", fromPort]);
		params.push(["ToPort", toPort]);
		params.push(["CidrIp", cidrIp]);
		ec2_httpclient.queryEC2("AuthorizeSecurityGroupIngress", params, this, true, "onCompleteAuthorizeSecurityGroupIngress", callback);
	},
	
	authorizeSourceGroup : function (groupName, sourceSecurityGroupName, sourceSecurityGroupOwnerId, callback) {
		params = []
		params.push(["GroupName", groupName]);
		params.push(["SourceSecurityGroupName", sourceSecurityGroupName]);
		params.push(["SourceSecurityGroupOwnerId", sourceSecurityGroupOwnerId]);
		ec2_httpclient.queryEC2("AuthorizeSecurityGroupIngress", params, this, true, "onCompleteAuthorizeSecurityGroupIngress", callback);
	},
		
	onCompleteAuthorizeSecurityGroupIngress : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},

	revokeSourceCIDR : function (groupName, ipProtocol, fromPort, toPort, cidrIp, callback) {
		params = []
		params.push(["GroupName", groupName]);
		params.push(["IpProtocol", ipProtocol]);
		params.push(["FromPort", fromPort]);
		params.push(["ToPort", toPort]);
		params.push(["CidrIp", cidrIp]);
		ec2_httpclient.queryEC2("RevokeSecurityGroupIngress", params, this, true, "onCompleteRevokeSecurityGroupIngress", callback);
	},
	
	revokeSourceGroup : function (groupName, sourceSecurityGroupName, sourceSecurityGroupOwnerId, callback) {
		params = []
		params.push(["GroupName", groupName]);
		params.push(["SourceSecurityGroupName", sourceSecurityGroupName]);
		params.push(["SourceSecurityGroupOwnerId", sourceSecurityGroupOwnerId]);
		ec2_httpclient.queryEC2("RevokeSecurityGroupIngress", params, this, true, "onCompleteRevokeSecurityGroupIngress", callback);
	},
		
	onCompleteRevokeSecurityGroupIngress : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},

	rebootInstances : function (instanceIds, callback) {
		var params = []
		for(var i in instanceIds) {
			params.push(["InstanceId."+(i+1), instanceIds[i]]);
		}
		ec2_httpclient.queryEC2("RebootInstances", params, this, true, "onCompleteRebootInstances", callback);
	},
		
	onCompleteRebootInstances : function (objResponse) {
		if (objResponse.callback)
			objResponse.callback();
	},

	getConsoleOutput : function (instanceId, callback) {
		ec2_httpclient.queryEC2("GetConsoleOutput", [["InstanceId", instanceId]], this, true, "onCompleteGetConsoleOutput", callback);
	},
		
	onCompleteGetConsoleOutput : function (objResponse) {
		var xmlDoc = objResponse.xmlDoc;
		var instanceId = xmlDoc.getElementsByTagName("instanceId")[0].firstChild.nodeValue;
		var timestamp = xmlDoc.getElementsByTagName("timestamp")[0].firstChild.nodeValue;
		var output = xmlDoc.getElementsByTagName("output")[0];
		if (output.textContent) {
			output = Base64.decode(output.textContent);
			output = output.replace(/\x1b/mg, "\n").replace(/\r/mg, "").replace(/\n+/mg, "\n");
			//output = output.replace(/\n+/mg, "\n")
		} else {
			output = null;
		}

		if (objResponse.callback)
			objResponse.callback(instanceId, timestamp, output);
	},

	onResponseComplete : function (responseObject) {
		if (responseObject.hasErrors) {
			return;
		}
		
 		eval("this."+responseObject.requestType+"(responseObject)");
	}
}

