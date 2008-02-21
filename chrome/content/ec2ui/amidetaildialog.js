var ec2_AMIDetails = {
	init : function() {
		image = window.arguments[0];
		document.getElementById("ec2ui.ami.id").value = image.id;
		document.getElementById("ec2ui.ami.location").value = image.location;
		document.getElementById("ec2ui.ami.state").value = image.state;
		document.getElementById("ec2ui.ami.ownerid").value = image.owner;
		document.getElementById("ec2ui.ami.ispublic").value = image.isPublic;
	}
}
