 
function get_date() {
    return new Date().toGMTString();
}

String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g,"");
}

function normalizeWS (str) {
    str = str.replace(/\n/," ");
    return str.replace(/\s+/," ");	
}


function AtmosRest(k,u) {

    this.key = k;
    this.uid = u;
    
    this.client = new XMLHttpRequest();
    
    this.setKey = function(k) { 
	this.key = k;
    }

    this.setUID = function(u) { 
	this.uid = u;
    }

    this.http = function (method, endpoint, emcheaders,data,callback) {
	if(!this.client) {
	    this.client = new XMLHttpRequest();
	}
	var temparray = new Array()
	emcheaders.each(function(h)  { 
	    temparray.push(h.key);
	});
	this.client.open(method, endpoint, true);
	for ( var i = 0; i < temparray.length ; i ++) {
            console.log(temparray[i] + "\t" + 	      emcheaders.get(temparray[i]));
	    this.client.setRequestHeader(temparray[i], emcheaders.get(temparray[i]));
	}
	this.client.onreadystatechange = callback;
	this.client.send(data);
    }

    this.emcrest = function(method, endpoint,hdrs,content_type,range, path, data, callback) {
	var date = get_date();
	var emcheaders = new Hash();
	if( content_type == "" || content_type == undefined) {
	    content_type = "text/plain;charset=UTF-8";
	}
	emcheaders.set("X-Emc-Date", date);
	emcheaders.set("X-Emc-Uid", this.uid);
	var path = "/rest/namespace" + path;
	var hash_string = this.build_hash_string(method, content_type,range, "",path, emcheaders);
	signature = this.do_signature(hash_string,this.key);
	emcheaders.set("X-Emc-Signature",signature);
	emcheaders.set("content-type",content_type);
	this.http(method, endpoint+path, emcheaders,data, callback);
    }

    this.getShareableURL = function(path, expiry)  {
	var method = "GET";
	var resource = "/rest/namespace" + path.toLowerCase();
	//ghetto sign
	var stringToSign = method + "\n";

	stringToSign += resource + "\n";
	stringToSign += this.uid + "\n";
	stringToSign += expiry;
	sig = this.do_signature(stringToSign, this.key);
	var shareable =  "http://accesspoint.atmosonline.com" + resource + "?uid=" + this.uid  + "&expires=" + expiry + "&signature=" + encodeURIComponent(sig);
	return shareable;
	
    }
    this.build_hash_string = function(method, content_type, range, date, path, headers){

	var emcheaders = headers;
	var string = "";
	string = method + "\n";
	
	if (content_type) { 
	    //must check for charset=UTF-8 on the tail since browsers add this automatically.
	    if (content_type.indexOf("charset=UTF-8") == -1) content_type +== "; charset=UTF-8";
	    string += content_type + "\n";	
	} else {
	    string +="\n";
	}
	if (range) {
	    string += range + "\n";
	} else {
	    string +="\n";
	}	
	if (date) {
	    string += date+'\n';
	} else {
	    string +="\n";
	}	

	string += path + "\n";

	emcheaders.each(function(pair) { 
	    var key =   normalizeWS(pair.key.toLowerCase().trim());
	    var value = normalizeWS(pair.value.trim());
	    emcheaders.unset(pair.key);
	    emcheaders.set(key,value);
	});
	
	emcheaders.keys().sort().each (function (k) { 
	    string += k+":" + emcheaders.get(k) + "\n";
	});

	return string.trim();
    }

    this.do_signature = function(string, secret) {
	var sig = Crypto.HMAC(Crypto.SHA1,string, Crypto.util.base64ToBytes(secret), {asBytes:true});	
	return Crypto.util.bytesToBase64(sig);		
    }
    
    this.setACL = function(file, hash)  {
	var method = "POST";
	var endpoint = "http://accesspoint.emccis.com"; 
	var emcheaders = new Array();
	var date = get_date();
	var content_type = "";//"text/plain;charset=UTF-8";
	var range = "";
	var aclstring = "";
	hash.forEach(function ( acl) {
	    if (aclstring != "") { 
		aclstring +=";";
	    }
	    aclstring += hash[acl] + "=" + acl ;
	});
    }

    this.list = function(path, onComp) {
	var method = "GET";
	var endpoint = "http://accesspoint.emccis.com"; //short term
	var content_type = "";//"text/plain;charset=UTF-8";
	var range = "";
	var client = this.client;
	this.emcrest(method, endpoint, "", content_type, range, path, "",function() {
	    if(client.status == 200 && client.readyState == 4) {	
		var parser=new DOMParser();
		xmlDoc=parser.parseFromString(client.responseText,"text/xml");
		if (onComp.onSuccess) onComp.onSuccess(client.responseText);
		if(client.responseXML != null)
		    console.log("success");
		else
		    console.log(client.responseText);
	    } else if (client.readyState == 4 && client.status != 200) {
		console.log("non 200 failure");
		console.log(client.responseText);
                if (onComp.onFailure) onComp.onFailure();
	    }
	});
    }
    
    this.getACL = function (path) {
	var method = "GET";
	var endpoint = "http://accesspoint.emccis.com"; //short term
	var content_type = "";//"text/plain;charset=UTF-8";
	var range = "";
	this.emcrest(method, endpoint, "", content_type, range, path, "",function() {
	    if(this.client.status == 200 && this.client.readyState == 4) {	
		console.log(this.client.responseText);
		if(this.client.responseXML != null)
		    console.log("success");
		else
		    console.log(this.client.responseText);
	    } else if (this.client.readyState == 4 && this.client.status != 200) {
		console.log("non 200 failure");
		console.log(this.client.responseText);
	    }
	});
    }

    this.getListableTags = function getListableTags(datapath) {
	var method = "GET";
	var endpoint = "http://accesspoint.emccis.com"; //short term
	var range = "";
	this.emcrest(method, endpoint, "", content_type, range, path, "",function() {
	    if(this.client.status == 200 && this.client.readyState == 4) {	
		console.log(this.client.responseText);
		if(this.client.responseXML != null)
		    console.log("success");
		else
		    console.log(this.client.responseText);
	    } else if (this.client.readyState == 4 && this.client.status != 200) {
		console.log("non 200 failure");
		console.log(this.client.responseText);
	    }
	});
    }


    this.getSystemMetaData = function(datapath) {
	var method = "GET";
	var endpoint = "http://accesspoint.emccis.com"; //short term
	var emcheaders = new Array();
	var date = get_date();
	var content_type = "";//"text/plain;charset=UTF-8";
	var range = "";
	var path = "/rest/namespace"+ datapath;

    }

    this.getUserMetaData = function(path) {
	var method = "POST";
	var endpoint = "http://accesspoint.emccis.com"; 
	var range = "";
	this.emcrest(method, endpoint, "", content_type, range, path, "",function() {
	    if(this.client.status == 200 && this.client.readyState == 4) {	
		console.log(this.client.responseText);
		if(this.client.responseXML != null)
		    console.log("success");
		else
		    console.log(this.client.responseText);
	    } else if (this.client.readyState == 4 && this.client.status != 200) {
		console.log("non 200 failure");
		console.log(this.client.responseText);
	    }
	});
    }



    this.create = function(path, content_type,onComp) {
	var method = "POST";
	var endpoint = "http://accesspoint.emccis.com"; 
	var range = "";
	
	if (!content_type) {
	    content_type = "application/octet-stream";
	}
	var client = this.client;
	this.emcrest(method, endpoint, "", content_type, range, path, "",function() {
	    console.log("callback fired");

	    if(client.status == 201) {
		console.log(client.responseText);
		if (onComp) onComp();
	    } else if (client.readyState == 4 && client.status != 200) {
		console.log("non 200 failure");
		console.log(client.responseText);
	    }
	});
	console.log("xhr fired");
    }

    this.jsdelete = function (path) {
	var method = "DELETE";
	var endpoint = "http://accesspoint.emccis.com"; 
	var content_type = "text/plain;charset=UTF-8";
	var range = "";
	this.emcrest(method, endpoint, "", content_type, range, path,"",function() {
	    if(this.client.status == 200 && this.client.readyState == 4) {	
		console.log(this.client.responseText);
		if(this.client.responseXML != null)
		    console.log("success");
		else
		    console.log(this.client.responseText);
	    } else if (this.client.readyState == 4 && this.client.status != 200) {
		console.log("non 200 failure");
		console.log(this.client.responseText);
	    }
	});
    }

    this.update = function(path, data,content_type) {
	var method = "PUT";
	var endpoint = "http://accesspoint.emccis.com"; 
	if(!content_type) {
	    content_type = "text/html;charset=UTF-8";
	}
	var range = "";
	this.emcrest(method, endpoint, "", content_type, range, path, data,function() {
	    if(this.client.status == 200 && this.client.readyState == 4) {	
		console.log(this.client.responseText);
		if(this.client.responseXML != null)
		    console.log("success");
		else
		    console.log(this.client.responseText);
	    } else if (this.client.readyState == 4 && this.client.status != 200) {
		console.log("non 200 failure");
		console.log(this.client.responseText);
	    }
	});
    }    

}
