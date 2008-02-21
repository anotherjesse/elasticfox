var ec2_httpclient = {
	handler : null,
	uri     : null,
	auxObj  : null,
	accessCode : null,
	secretKey : null,
	timers : {},	

	// Manually updated, ugly.
	USER_AGENT : "EC2 UI FireFox Extension/__VERSION__-__BUILD__",

	API_VERSION : "2007-08-29",

	// TESTING ONLY
	kpcreated : false,
	imgregistered : false,
	launched : false,
	terminated : false,

	getNsResolver : function() {
		var client = this;
		return function(prefix) {
			var ns = {
			's':  "http://schemas.xmlsoap.org/soap/envelope/",	// SOAP namespace 
			'ec2': "http://ec2.amazonaws.com/doc/"+client.API_VERSION+"/"	// EC2 namespace, must match request version
			};
			return ns[prefix] || null;
		}
	},

	setCredentials : function (accessCode, secretKey) {
		this.accessCode = accessCode;
		this.secretKey = secretKey;
	},
	
	newInstance : function() {
		var xmlhttp;
		if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
			try {
				xmlhttp = new XMLHttpRequest();
			} catch (e) {
				xmlhttp = false
			}
		}
		return xmlhttp;
	},

	sigParamCmp : function(x, y) {
		if (x[0].toLowerCase() < y[0].toLowerCase ()) {
			return -1;
		}
		if (x[0].toLowerCase() > y[0].toLowerCase()) {
		   return 1;
		}
		return 0;
	},

	addZero : function(vNumber) { 
		return ((vNumber < 10) ? "0" : "") + vNumber;
	},

	formatDate : function(vDate, vFormat) {
		var vDay              = this.addZero(vDate.getUTCDate()); 
		var vMonth            = this.addZero(vDate.getUTCMonth()+1); 
		var vYearLong         = this.addZero(vDate.getUTCFullYear()); 
		var vYearShort        = this.addZero(vDate.getUTCFullYear().toString().substring(3,4)); 
		var vYear             = (vFormat.indexOf("yyyy")>-1?vYearLong:vYearShort);
		var vHour             = this.addZero(vDate.getUTCHours()); 
		var vMinute           = this.addZero(vDate.getUTCMinutes()); 
		var vSecond           = this.addZero(vDate.getUTCSeconds()); 
		var vDateString       = vFormat.replace(/dd/g, vDay).replace(/MM/g, vMonth).replace(/y{1,4}/g, vYear);
		vDateString           = vDateString.replace(/hh/g, vHour).replace(/mm/g, vMinute).replace(/ss/g, vSecond);
		return vDateString;
	},

	queryEC2 : function (action, params, objActions, isSync, reqType, callback) {
		if (this.accessCode == "") return;
		
		while(true) {
			try {
				var rsp = this.queryEC2Impl(action, params, objActions, isSync, reqType, callback);
				if (rsp.hasErrors) {
					if (!this.errorDialog("EC2 responded with an error for "+action, rsp.faultCode + ": " + rsp.faultString)) {
						return false;
					}
				} else {
					objActions.onResponseComplete(rsp);
					return true;
				}
			} catch (e) {
				alert("An error occurred while calling "+action+"\n"+e);
				return null;
			}
		}
	},
	
	errorDialog : function(msg, e) {
		var retry = {value:null};
		window.openDialog(
			"chrome://ec2ui/content/dialog_retry_cancel.xul", 
			null, 
			"chrome,centerscreen,modal", 
			msg,
			e,
			retry);
		return retry.value;
	},
	
	queryEC2Impl : function (action, params, objActions, isSync, reqType, callback) {
		var curTime = new Date();
		var formattedTime = this.formatDate(curTime, "yyyy-MM-ddThh:mm:ssZ");

		var sigValues = new Array();
		sigValues.push(new Array("Action", action));
		sigValues.push(new Array("AWSAccessKeyId", this.accessCode));
		sigValues.push(new Array("SignatureVersion","1"));
		sigValues.push(new Array("Version",this.API_VERSION));
		sigValues.push(new Array("Timestamp",formattedTime));

		// Mix in the additional parameters. params must be an Array of tuples as for sigValues above
		for (var i = 0; i < params.length; i++) {
			sigValues.push(params[i]);
		}

		// Sort the parameters by their lowercase name
		sigValues.sort(ec2_httpclient.sigParamCmp);

		// Construct the string to sign and query string
		var strSig = "";
		var queryParams = "?";
		for (var i = 0; i < sigValues.length; i++) {
			strSig += sigValues[i][0] + sigValues[i][1];
			queryParams += sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
			if (i < sigValues.length-1)
				queryParams += "&";
		}

		log("StrSig ["+strSig+"]");
		log("Params ["+queryParams+"]");
		
		var sig = b64_hmac_sha1(this.secretKey, strSig);
		log("Sig ["+sig+"]");
		
		var url = ec2ui_prefs.getServiceURL() + "/" + queryParams + "&Signature="+encodeURIComponent(sig)
		log("URL ["+url+"]");
		
		var timerKey = strSig+":"+formattedTime;
		
		if (!ec2ui_prefs.isOfflineEnabled()) {
			var xmlhttp = this.newInstance();
			xmlhttp.open("GET", url, !isSync);
			xmlhttp.setRequestHeader("User-Agent", this.USER_AGENT);
			this.startTimer(timerKey, ec2ui_prefs.getRequestTimeout(), xmlhttp.abort);
			try {
				xmlhttp.send(null);
			} catch(e) {
				if (!this.stopTimer(timerKey)) {
					// A timer didn't exist, this is unexpected
					throw e;
				}
		
				var responseObject = {
					callback: callback, 
					requestType : reqType, 
					faultCode : "Timeout",
					faultString : "Your request timed out, you may want to have another stab at it", 
					hasErrors : true
				};
				return responseObject;
			}
		} else {
			log("WARNING: Working offline, faking HTTP request");
			var xml = null;

			if (action == "RegisterImage") {
				xml = '<?xml version="1.0"?><RegisterImageResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><imageId>ami-55ae4b01</imageId></RegisterImageResponse>';
				this.imgregistered = true;
			} else if (action == 'DescribeImages') {
				if (!this.imgregistered) {
					xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeImagesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><imagesSet><item><imageId>ami-07af4a6e</imageId><imageLocation>nbn-test/nbn-slave-4.manifest</imageLocation><imageState>available</imageState><imageOwnerId>494219943130</imageOwnerId><isPublic>false</isPublic></item><item><imageId>ami-68ae4b01</imageId><imageLocation>ec2-public-images/fedora-core4-base.manifest</imageLocation><imageState>deregistered</imageState><imageOwnerId>206029621532</imageOwnerId><isPublic>true</isPublic></item></imagesSet></DescribeImagesResponse>';
				} else {
					xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeImagesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><imagesSet><item><imageId>ami-07af4a6e</imageId><imageLocation>nbn-test/nbn-slave-4.manifest</imageLocation><imageState>available</imageState><imageOwnerId>494219943130</imageOwnerId><isPublic>false</isPublic></item><item><imageId>ami-68ae4b01</imageId><imageLocation>ec2-public-images/fedora-core4-base.manifest</imageLocation><imageState>deregistered</imageState><imageOwnerId>206029621532</imageOwnerId><isPublic>true</isPublic></item><item><imageId>ami-55ae4b01</imageId><imageLocation>test/new.manifest</imageLocation><imageState>available</imageState><imageOwnerId>206029621532</imageOwnerId><isPublic>false</isPublic></item></imagesSet></DescribeImagesResponse>';
				}
			} else if (action == 'DescribeKeyPairs') {
				if (!this.kpcreated) {
					xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeKeyPairsResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><keySet><item><keyName>testkey</keyName><keyFingerprint>5a:ab:b6:6d:e3:7c:35:73:69:67:06:22:75:cd:4c:92:aa:57:5d:54</keyFingerprint></item><item><keyName>andries</keyName><keyFingerprint>79:e3:93:0f:78:62:c3:eb:29:b5:af:20:e2:3a:46:ff:25:97:8c:dc</keyFingerprint></item></keySet></DescribeKeyPairsResponse>';
				} else {
					xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeKeyPairsResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><keySet><item><keyName>testkey</keyName><keyFingerprint>5a:ab:b6:6d:e3:7c:35:73:69:67:06:22:75:cd:4c:92:aa:57:5d:54</keyFingerprint></item><item><keyName>andries</keyName><keyFingerprint>79:e3:93:0f:78:62:c3:eb:29:b5:af:20:e2:3a:46:ff:25:97:8c:dc</keyFingerprint></item><item><keyName>newkey</keyName><keyFingerprint>1e:66:56:da:44:16:8b:39:be:c2:a7:eb:4a:a9:a7:cd:90:07:a6:b0</keyFingerprint></item></keySet></DescribeKeyPairsResponse>';
				}
			} else if (action == 'RunInstances') {
				this.launched = true;
				xml = '<RunInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01"><reservationId>r-47a5402e</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId></item></groupSet><instancesSet><item><instanceId>i-2ba64342</instanceId><imageId>ami-60a54009</imageId><instanceState><code>0</code><name>pending</name></instanceState><dnsName></dnsName><keyName>example-key-name</keyName></item><item><instanceId>i-2bc64242</instanceId><imageId>ami-60a54009</imageId><instanceState><code>0</code><name>pending</name></instanceState><dnsName></dnsName><keyName>example-key-name</keyName></item></instancesSet></RunInstancesResponse>';
			} else if (action == 'TerminateInstances') {
				this.terminated = true;
				xml = '<TerminateInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01"><instancesSet><item><instanceId>i-2bc64242</instanceId><shutdownState>shutting-down</shutdownState><previousState>running</previousState></item><item><instanceId>i-2ba64342</instanceId><shutdownState>shutting-down</shutdownState><previousState>running</previousState></item></instancesSet></TerminateInstancesResponse>';
			} else if (action == 'DescribeInstances') {
				if (!this.launched && !this.terminated) {
					xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><reservationSet><item><reservationId>r-9832d7f1</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId><groupId>mygroup</groupId></item></groupSet><instancesSet><item><instanceId>i-b0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason>Because you need a reason</reason><keyName>foo-key</keyName><reason /></item><item><instanceId>i-c0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason /></item></instancesSet></item><item><reservationId>r-9832d7f1</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId></item></groupSet><instancesSet><item><instanceId>i-d0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason>Because you need a reason</reason><keyName>foo-key</keyName><reason /></item></instancesSet></item></reservationSet></DescribeInstancesResponse>';
				} else {
					if (!this.terminated) {
						xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><reservationSet><item><reservationId>r-9832d7f1</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId><groupId>mygroup</groupId></item></groupSet><instancesSet><item><instanceId>i-b0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason>Because you need a reason</reason><keyName>foo-key</keyName><reason /></item><item><instanceId>i-c0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason /></item></instancesSet></item><item><reservationId>r-9832d7f1</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId></item></groupSet><instancesSet><item><instanceId>i-d0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason>Because you need a reason</reason><keyName>foo-key</keyName><reason /></item></instancesSet></item><item><reservationId>r-47a5402e</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId></item></groupSet><instancesSet><item><instanceId>i-2ba64342</instanceId><imageId>ami-60a54009</imageId><instanceState><code>0</code><name>pending</name></instanceState><dnsName></dnsName><keyName>example-key-name</keyName></item><item><instanceId>i-2bc64242</instanceId><imageId>ami-60a54009</imageId><instanceState><code>0</code><name>pending</name></instanceState><dnsName></dnsName><keyName>example-key-name</keyName></item></instancesSet></item></reservationSet></DescribeInstancesResponse>';
					} else {
						xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><reservationSet><item><reservationId>r-9832d7f1</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId><groupId>mygroup</groupId></item></groupSet><instancesSet><item><instanceId>i-b0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason>Because you need a reason</reason><keyName>foo-key</keyName><reason /></item><item><instanceId>i-c0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason /></item></instancesSet></item><item><reservationId>r-9832d7f1</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId></item></groupSet><instancesSet><item><instanceId>i-d0cc28c9</instanceId><imageId>ami-6ba54002</imageId><instanceState><code>272</code><name>running</name></instanceState><dnsName>domU-12-31-34-00-03-8E.usma2.compute.amazonaws.com</dnsName><reason>Because you need a reason</reason><keyName>foo-key</keyName><reason /></item></instancesSet></item><item><reservationId>r-47a5402e</reservationId><ownerId>494219943130</ownerId><groupSet><item><groupId>default</groupId></item></groupSet><instancesSet><item><instanceId>i-2ba64342</instanceId><imageId>ami-60a54009</imageId><instanceState><code>0</code><name>shutting-down</name></instanceState><dnsName></dnsName><keyName>example-key-name</keyName></item><item><instanceId>i-2bc64242</instanceId><imageId>ami-60a54009</imageId><instanceState><code>0</code><name>shutting-down</name></instanceState><dnsName></dnsName><keyName>example-key-name</keyName></item></instancesSet></item></reservationSet></DescribeInstancesResponse>';
					}
				}
			} else if (action == 'DescribeImageAttribute') {
				xml = '<DescribeImageAttributesResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01"><imageId>ami-61a54008</imageId><launchPermission><item><group>all</group></item><item><userId>495219933132</userId></item><item><userId>123456123456</userId></item></launchPermission></DescribeImageAttributesResponse>';
			} else if (action == 'ModifyImageAttribute') {
				xml = '<ModifyImageAttributeResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01"><return>true</return></ModifyImageAttributeResponse>';
			} else if (action == 'DescribeSecurityGroups') {
				xml = '<?xml version="1.0" encoding="UTF-8"?><DescribeSecurityGroupsResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><securityGroupInfo><item><ownerId>494219943130</ownerId><groupName>bob</groupName><groupDescription>foo</groupDescription><ipPermissions/></item><item><ownerId>494219943130</ownerId><groupName>default</groupName><groupDescription>default group</groupDescription><ipPermissions><item><ipProtocol>tcp</ipProtocol><fromPort>0</fromPort><toPort>65535</toPort><groups><item><userId>494219943130</userId><groupName>default</groupName></item></groups><ipRanges/></item><item><ipProtocol>udp</ipProtocol><fromPort>0</fromPort><toPort>65535</toPort><groups><item><userId>494219943130</userId><groupName>default</groupName></item></groups><ipRanges/></item><item><ipProtocol>icmp</ipProtocol><fromPort>-1</fromPort><toPort>-1</toPort><groups><item><userId>494219943130</userId><groupName>default</groupName></item></groups><ipRanges/></item><item><ipProtocol>tcp</ipProtocol><fromPort>22</fromPort><toPort>22</toPort><groups/><ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges></item><item><ipProtocol>tcp</ipProtocol><fromPort>80</fromPort><toPort>80</toPort><groups/><ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges></item></ipPermissions></item><item><ownerId>494219943130</ownerId><groupName>monte-pi-listener</groupName><groupDescription>Monte PI Listeners</groupDescription><ipPermissions><item><ipProtocol>tcp</ipProtocol><fromPort>80</fromPort><toPort>80</toPort><groups><item><userId>494219943130</userId><groupName>monte-pi-slaves</groupName></item></groups><ipRanges/></item><item><ipProtocol>tcp</ipProtocol><fromPort>22</fromPort><toPort>22</toPort><groups/><ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges></item><item><ipProtocol>tcp</ipProtocol><fromPort>0</fromPort><toPort>65535</toPort><groups/><ipRanges><item><cidrIp>216.182.227.192/26</cidrIp></item></ipRanges></item></ipPermissions></item><item><ownerId>494219943130</ownerId><groupName>monte-pi-slaves</groupName><groupDescription>Monte PI Slaves</groupDescription><ipPermissions><item><ipProtocol>tcp</ipProtocol><fromPort>22</fromPort><toPort>22</toPort><groups/><ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges></item></ipPermissions></item><item><ownerId>494219943130</ownerId><groupName>testgroup</groupName><groupDescription>Test Group</groupDescription><ipPermissions><item><ipProtocol>tcp</ipProtocol><fromPort>22</fromPort><toPort>22</toPort><groups/><ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges></item></ipPermissions></item></securityGroupInfo></DescribeSecurityGroupsResponse>';
				//xml = '<?xml version="1.0"><DescribeSecurityGroupsResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/"><securityGroupInfo><item><ownerId>144195293461</ownerId><groupName>default</groupName><groupDescription>default group</groupDescription><ipPermissions><item><ipProtocol>tcp</ipProtocol><fromPort>0</fromPort><toPort>65535</toPort><groups><item><userId>144195293461</userId><groupName>default</groupName></item></groups><ipRanges/></item><item><ipProtocol>udp</ipProtocol><fromPort>0</fromPort><toPort>65535</toPort><groups><item><userId>144195293461</userId><groupName>default</groupName></item></groups><ipRanges/></item><item><ipProtocol>icmp</ipProtocol><fromPort>-1</fromPort><toPort>-1</toPort><groups><item><userId>144195293461</userId><groupName>default</groupName></item></groups><ipRanges/></item></ipPermissions></item></securityGroupInfo></DescribeSecurityGroupsResponse>';
			} else if (action == 'CreateKeyPair') {
				this.kpcreated = true;
				xml = 
					['<?xml version="1.0" encoding="UTF-8"?>',
					'<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">',
					'  <SOAP-ENV:Body>',
					'    <CreateKeyPairResponse xmlns="http://ec2.amazonaws.com/doc/2006-10-01/">',
					'      <keyName>newkey</keyName>',
					'      <keyFingerprint>1e:66:56:da:44:16:8b:39:be:c2:a7:eb:4a:a9:a7:cd:90:07:a6:b0</keyFingerprint>',
					'      <keyMaterial>-----BEGIN RSA PRIVATE KEY-----',
					'MIIEpAIBAAKCAQEAsX9ymjyl/92kRJgrv65RJwrawJ5hUT7CudJki/CeZN7npSLkPhEt93Y40y3d',
					'LHg2ik4RmwPE4LppCZ7N6Oa7koL1+o8ml1mf4evaxBIqcJU0UBLJKph/i6FvKzOR87QBvmFZJOgY',
					'VrOBMUnxxTu/uG6c0g1swjdoPoL4P43pCW46SCpQR2+YgCbS9GYS952I4q0exswMnyzZ/itjV7UV',
					'nflNuzOlTj1AyyvZWj67sf1rPJI1o34OEbnsPNVzTrVbhefNkd6D2YgUGe4nSigHJ8t5mJ+Uyqng',
					'KlkdonlCCXoNynXjiyDqclcP+863JOf0/bD4rqC56svOeAu6AZUwnQIDAQABAoIBAQCtnIEVx5h+',
					'aeZQiZ7Q/8m0rHNG0CNT+lUwuE9MaXAkLbrZ1QT2iIszbtkqBcQ9yN9f6/hgbRFW1j4DAOdalMSH',
					'C71Y9EfE5g7yRWVXPoVwVSAz6gwFs9+dTauUz/5EJp9F/aXZ6YJU24LUGQV363cdCGQvOJ5WYSd/',
					'bU8vqrhzVVG7PJGPpQZlGwTVwDskR5JH4C/B1MxiIRBOeGzlkkKBpW2bjK5mROg/XTFQnLDQ7mlr',
					'2zUturF8d5aTDLx+6sqc02M/OGAEWE+smoJKjPtvyHcEavXFy/ZiJ1Lx9TXP5tn4UYZS2/xWPZdm',
					'z1lf6C23F1jlTgJTlrB9UvK4zOdBAoGBAOKAZ0r6BtQBSTp/60OvLKi8PQHB8WkQ9t4VgdOmSHv4',
					'bv2nICJDj+T+y9s6LZvbJ2rm/PvmDNwMgBLaUfEEaZ+e75cKoUTxbCU2HUaulBH8IXQgJYgPAyTM',
					'UU1V58RDoS3H9f037hZmctgIUFTgKvO3UDcXbkNEoZVIMKPUA4b5AoGBAMidQJnz3p6chlGg+Pka',
					'LwzdduFKQt81b0BB/TLTOMMyYU0YY2B2BVgjmy8CFSkEoUq6Bz9oQB3jSrCt3EHfz/keQelH7Pf+',
					'KSDIYQEMO7r45b86HsdH2lhM/KKVNDV5wf31FUBIuds31nU6VniCDvCdy1zDwzG8jJgjubMc5qvF',
					'AoGBAIV0Dmg4xMkpMNJNCHtKvU92CaP9d5XmLu5PUb04nkCc8hh13hMSJ7hPACHdN347NBBipPBu',
					'bWlB3Dw/ckRFy04HQTeHRdnvPT73kWxR9GBcZAGd5z8xSTLnR4f/c51KE697v85ApAGCv2vWCi7Y',
					'HbaXbaXoIkl0KJhifnYotyNRAoGAFUvEKNOfhTzecVniNCdYaUg1L3M/qAw3FB4tL7EGbIozlAiL',
					'vBirNpEJDzNsZZ9NM+6NiGibrdCMBDdgk0mb/Tj+DDKLcEP1v7olugO/b3iugt87lzIEdq0tgGDQ',
					'WwDi2/+hUuKlgCTsSiN4PHCp/1bw2JcbaHM4hYn9U4s03XUCgYBl4S4dutAFx9qI6n5K77FQKjhf',
					'oC/pQmCniHJhMKNLRLUrzazdQvJBOALiAMUJYv5l8n9UbeiTso27umcyy9IjdneDW9OqaMIvLx7c',
					'dfLyHvAnzT8X4TNCr5mYTXnLgR9Oi8P3jKTVgZoOH33HJzW2FJYgXvGILR0UXOJNhN0rlQ==',
					'-----END RSA PRIVATE KEY-----</keyMaterial>',
					'    </CreateKeyPairResponse>',
					'  </SOAP-ENV:Body>',
					'</SOAP-ENV:Envelope>'].join("\n");
			} else if (action == 'RebootInstances') {
				xml = [
				   '<?xml version="1.0" encoding="UTF-8"?>',
				   '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">',
				   '  <SOAP-ENV:Body>',
				   '    <RebootInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2007-01-03/">',
				   '      <return>true</return>',
				   '    </RebootInstancesResponse>',
				   '  </SOAP-ENV:Body>',
				   '</SOAP-ENV:Envelope>'
				].join("\n");
			} else if (action == 'GetConsoleOutput') {
				xml = [
				   '<?xml version="1.0" encoding="UTF-8"?>',
				   '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">',
				   '  <SOAP-ENV:Body>',
				   '    <GetConsoleOutputResponse xmlns="http://ec2.amazonaws.com/doc/2007-01-03/">',
				   '      <instanceId>i-24ba5d4d</instanceId>',
				   '      <timestamp>2007-02-08T23:38:07.000-08:00</timestamp>',
				   '      <output>dGVzdCBjb25zb2xlIG91dHB1dA0KbGluZSBoZXJlDQphbmQgaGVyZQ0KYW5kIGhlcmUNCmFuZCBo',
				   'ZXJlDQphbmQgaGVyZQ0KYW5kIGhlcmUNCmFuZCBoZXJlDQphbmQgaGVyZQ0KYW5kIGhlcmUNCmFu',
				   'ZCBoZXJlDQphbmQgaGVyZQ0KICAgICAgICAgICAgICAgYW5kIG92ZXIgaGVyZQ0KYW5kIGFub3Ro',
				   'ZXIgaGVyZQ0KDQoNCmFuZCBmaW5hbGx5IG9uZSBkb3duIGhlcmU=',
				   '</output>',
				   '    </GetConsoleOutputResponse>',
				   '  </SOAP-ENV:Body>',
				   '</SOAP-ENV:Envelope>'
				].join("\n");
			}

			log("Fake response: "+xml);

			var parser = new DOMParser(); 
			var xmlDoc = parser.parseFromString(xml, "text/xml"); 
			var responseObject = {
				xmlDoc: xmlDoc,
				callback: callback,
				//strHeaders: xmlhttp.getAllResponseHeaders(), 
				requestType : reqType, 
				//faultString : faultString, 
				hasErrors : false
			};
			return responseObject;
		}

		// FIXME: Clean this lot up. Get rid of the async stuff if we're not using it.	   
		if (isSync) {
			log("Sync Response = " + xmlhttp.status + "("+xmlhttp.readyState+"): " + xmlhttp.responseText);

			if (xmlhttp.status >= 200 && xmlhttp.status < 300 ) {
				this.stopTimer(timerKey);
				var responseObject = {
					xmlDoc: xmlhttp.responseXML, 
					strHeaders: xmlhttp.getAllResponseHeaders(), 
					callback: callback, 
					requestType : reqType
				};
		  
				return responseObject;
			} else {
				this.stopTimer(timerKey);
				return this.unpackXMLErrorRsp(xmlhttp, reqType, callback);
			}	
		} else {
			xmlhttp.onreadystatechange = function () {
				if (xmlhttp.readyState != 4) {
					return;
				} else {
					log("Async Response = " + xmlhttp.status + ": " + xmlhttp.responseText);
					if (xmlhttp.status >= 200 && xmlhttp.status < 300 ) {
						var responseObject = {
							xmlDoc: xmlhttp.responseXML, 
							strHeaders: xmlhttp.getAllResponseHeaders(), 
							callback: callback, 
							requestType : reqType
						};
						objActions.onResponseComplete(responseObject);						
					} else {
						objActions.onResponseComplete(this.unpackXMLErrorRsp(xmlhttp, reqType, callback));
					}
				}
			}
		}
	},
	
	unpackXMLErrorRsp : function(xmlhttp, reqType, callback) {
		var faultCode = "Unknown";
		var faultString = "none";
		if (xmlhttp.responseXML.getElementsByTagName("Code")[0].firstChild) {
			faultCode = xmlhttp.responseXML.getElementsByTagName("Code")[0].firstChild.nodeValue;
		}
		if (xmlhttp.responseXML.getElementsByTagName("Message")[0].firstChild) {
			faultString = xmlhttp.responseXML.getElementsByTagName("Message")[0].firstChild.nodeValue;
		}

		var responseObject = {
			xmlDoc: xmlhttp.responseXML, 
			strHeaders: xmlhttp.getAllResponseHeaders(), 
			callback: callback, 
			requestType : reqType, 
			faultCode : faultCode,
			faultString : faultString, 
			hasErrors : true
		};
		
		return responseObject;
	},
	
	startTimer : function(key, timeout, expr) {
		var timer = window.setTimeout(expr, timeout);
		this.timers[key] = timer;
	},

	stopTimer : function(key, timeout) {
		var timer = this.timers[key];
		this.timers[key] = null;
		if (timer == null) {
			return false;
		}
		window.clearTimeout(timer);
		return true;
	}
}
