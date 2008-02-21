var ec2_InstanceDetails = {
   init : function() {
      instance = window.arguments[0];
      document.getElementById("ec2ui.instance.resid").value = instance.resId;
      document.getElementById("ec2ui.instance.instanceid").value = instance.id;
      document.getElementById("ec2ui.instance.amiid").value = instance.imageId;
      document.getElementById("ec2ui.instance.ownerid").value = instance.ownerId;
      document.getElementById("ec2ui.instance.publicdnsname").value = instance.publicDnsName;
      document.getElementById("ec2ui.instance.privatednsname").value = instance.privateDnsName;
      document.getElementById("ec2ui.instance.keyname").value = instance.keyName;
      document.getElementById("ec2ui.instance.reason").value = instance.reason;
      document.getElementById("ec2ui.instance.amiLaunchIdx").value = instance.amiLaunchIdx;
      document.getElementById("ec2ui.instance.instanceType").value = instance.instanceType;
      document.getElementById("ec2ui.instance.launchTime").value = instance.launchTime.toString();
      
      var secGroups = document.getElementById("ec2ui.instance.securitygrouplist");
      for(var i in instance.groupList) {
	 secGroups.appendItem(instance.groupList[i]);
      }
   }
}
