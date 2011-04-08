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


function AtmosRest(k,u, host) {
    this.key = k;
    this.uid = u;
    this.endpoint = host;

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
	     
	    this.client.setRequestHeader(temparray[i], emcheaders.get(temparray[i]));
	}
	this.client.onreadystatechange = callback;
	//This may need to be removed - Force all mime types to user defined?
	//this.client.overrideMimeType('text/plain; charset=x-user-defined');
	if(method == "PUT") {
	    this.client.sendAsBinary(data);
	} else {
	    this.client.send(data);
	}
    }

    this.emcrest = function(method, endpoint,hdrs,content_type,range, path, data, callback) {
	var date = get_date();
	var emcheaders;
	if (hdrs == "") {
	    emcheaders= new Hash();
	} else {
	    emcheaders = hdrs;
	}

	if( content_type == "" || content_type == undefined) {
	    content_type = "text/plain;charset=UTF-8";
	}
	if ( content_type.indexOf("charset") == -1 ) { content_type += "; charset=UTF-8";}

	emcheaders.set("X-Emc-Date", date);
	emcheaders.set("X-Emc-Uid", this.uid);
	var path = "/rest/namespace" + path;
	var hash_string = this.build_hash_string(method, content_type,range, "",path, emcheaders);
	signature = this.do_signature(hash_string,this.key);
	emcheaders.set("X-Emc-Signature",signature);
	emcheaders.set("content-type",content_type);
	console.log(content_type);
	this.http(method, endpoint+path, emcheaders,data, callback);
    }

    this.getShareableURL = function(path, expiry)  {
	var method = "GET";
	var resource = "/rest/namespace" + path;
	//ghetto sign
	var stringToSign = method + "\n";

	stringToSign += resource.toLowerCase() + "\n";
	stringToSign += this.uid + "\n";
	stringToSign += expiry;
	sig = this.do_signature(stringToSign, this.key);
	var shareable =  this.endpoint + resource + "?uid=" + this.uid  + "&expires=" + expiry + "&signature=" + encodeURIComponent(sig);
	return shareable;
    
    }
    this.build_hash_string = function(method, content_type, range, date, path, headers){

	var emcheaders = headers;
	var string = "";
	string = method + "\n";
		
	if (content_type) { 
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

	string += path.toLowerCase().trim() + "\n";

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
	

    //acls = UID=FULL_CONTROL etc
    //groupacls not support currently
    this.setACL = function(path, acls, onComp) {
	path += "?acl";
	var method = "POST";
	var range = "";
	var acllist = ""
	if (acls == undefined) { 
	    metadata = new Hash() ; 
	}
	acls.each ( function(pair) {
	    if (acllist != "") { 
		acllist += "," + pair.key + "=" + pair.value;
	    } else { 
		acllist +=  pair.key + "=" + pair.value;
	    }
	    });

	var hdrs = new Hash();
	if(acllist.length>2) {
	    hdrs.set("x-emc-useracl", acllist);
	}
	var client = this.client;

	this.emcrest(method, this.endpoint, hdrs, "", range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    if(client.responseXML != null)
			;//			console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {
		    ;//console.log("non 200 failure");
		    ;//console.log(client.responseText);
		}
	    });
    }


    this.list = function(path, onComp) {
	var method = "GET";
	var content_type = "";//"text/plain;charset=UTF-8";
	var range = "";
	var client = this.client;
	if(!onComp) { onComp="";}
	this.emcrest(method, this.endpoint, "", content_type, range, path,"",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    var parser=new DOMParser();
		    xmlDoc=parser.parseFromString(client.responseText,"text/xml");
		    if (onComp.onSuccess) onComp.onSuccess(xmlDoc);
		    if(client.responseXML != null)
			;
		    else
			;
		} else if (client.readyState == 4 && client.status != 200) {
		    ;
                    if (onComp.onFailure) onComp.onFailure();
		}
	    });
    }
	
    this.getACL = function (path, onComp) {
	path +="?acl"
	var method = "GET";
	var content_type = "";//"text/plain;charset=UTF-8";
	var range = "";
	var client = this.client

	this.emcrest(method, this.endpoint, "", content_type, range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    ;//console.log(client.responseText);
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		}
	    });
    }

    this.getListableTags = function getListableTags(datapath) {
	var method = "GET";
	var range = "";
	var client = this.client;
	this.emcrest(method, this.endpoint, "", content_type, range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    ;//console.log(client.responseText);
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		}
	    });
    }


    this.getUserMetaData = function(path, onComp) {
	path +="?metadata/user";
	var method = "GET";
	var range = "";
	var client=  this.client;
	this.emcrest(method, this.endpoint, "", "", range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    ;//console.log(client.getResponseHeader("x-emc-listable-meta"));
		    ;//console.log(client.responseText);
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		}
	    });
    }

    this.getVersions = function(path, onComp) {
	path +="?versions";
	var method = "GET";
	var range = "";
	var client=  this.client;
	this.emcrest(method, this.endpoint, "", "", range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    ;//console.log(client.responseText);
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		}
	    });
    }

    this.getSystemMetaData = function(path, onComp) {
	path +="?metadata/system";
	var method = "GET";
	var range = "";
	var client=  this.client;
	this.emcrest(method, this.endpoint, "", "", range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    ;//console.log(client.responseText);
		    ;//console.log(client.getResponseHeader("x-emc-meta"));
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		}
	    });
    }
   
    this.version = function(path,onComp) {
	path +="?versions";
	var method = "POST";
	var range = "";
	var client = this.client;
	var content_type = "";
	if(!onComp) { onComp = "";}
	this.emcrest(method, this.endpoint, "", content_type, range, path, "",function() {
		if(client.status == 201) {
		    ;//console.log(client.responseText);
		    if (onComp.onSuccess) onComp.onSuccess();
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		    if (onComp.onFailure) onComp.onFailure();
		}
	    });
    }

    //unlistablemetadata = {key: value, key2 : value2}
    //listablemetadata = = {key: value, key2 : value2}

    this.setUserMetaData = function(path, metadata, nonlistable,onComp) { 
	path += "?metadata/user";
	var method = "POST";
	var range = "";
	var listable = "";
	var unlistable = "";
        if(!onComp) {onComp = "";}

	if (!metadata) { 
	    metadata = new Hash() ; 
	}
	if(!nonlistable) {
	    nonlistable = new Hash();
	}
	metadata.each ( function(pair) {
	    if (listable != "") { 
		listable += "," + pair.key + "=" + pair.value;
	    } else { 
		listable +=  pair.key + "=" + pair.value;
	    }
	    });

	nonlistable.each ( function(pair) {
	    if (unlistable != "") { 
		unlistable += "," + pair.key + "=" + pair.value;
	    } else { 
		unlistable +=  pair.key + "=" + pair.value;
	    }
	    });

	var hdrs = new Hash();
	if(listable.length>2) {
	    hdrs.set("x-emc-listable-meta", listable);
	}
	if(unlistable.length >2) {
	    hdrs.set("x-emc-meta",unlistable);
	}
	var client = this.client;

	this.emcrest(method, this.endpoint, hdrs, "", range, path, "",function() {
		if(client.status == 200 && client.readyState == 4) {	
		    ;//console.log(client.responseText);
                    if(onComp.onSuccess) { onComp.onSuccess();}
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log(client.responseText);
		}
	    });
    }




    this.create = function(path, content_type,onComp) {
	var method = "POST";
	var range = "";
	var client = this.client;

	if (!content_type) {
	    content_type = "application/octet-strem";
	}
	if (!onComp) {onComp="";}
	this.emcrest(method, this.endpoint, "", content_type, range, path, "",function() {
		if(client.status == 201 && client.readyState == 4) {
		    ;//console.log("201 response text\n" + client.responseText);
		    if (onComp.onSuccess) onComp.onSuccess();
		} else if (client.readyState == 4 && client.status != 200) {

		    ;//console.log("ready &&!=200" + client.responseText);
		    if (onComp.onFailure) onComp.onFailure();
		}
	    });
    }

    this.jsdelete = function (path, onComp) {
	var method = "DELETE";
	var content_type = "text/plain;charset=UTF-8";
	var range = "";
	var client = this.client
	if (!onComp) {onComp = "";};
	this.emcrest(method, this.endpoint, "", content_type, range, path,"",function() {
		if(client.status == 204 && client.readyState == 4) {	
		    ;//console.log(client.responseText);
		    if (onComp.onSuccess) {onComp.onSuccess();}
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 204) {
                    if(onComp.onFailure) { onComp.onFailure();}
		    ;//console.log(client.responseText);
		}
	    });
    }

    this.update = function(path, data,content_type, onComp) {
	var method = "PUT";
	if(!content_type) {
	    content_type = "text/html;charset=UTF-8";
	}
	if (onComp == undefined) { onComp = "";	}
	var range = "";
	var client = this.client
	this.emcrest(method, this.endpoint, "", content_type, range, path, data,function() {
		if(client.status == 200 && client.readyState == 4) {	
		    if (onComp.onSuccess) onComp.onSuccess();
		    ;//console.log(client.responseText);
		    if(client.responseXML != null)
			;//console.log("success");
		    else
			;//console.log(client.responseText);
		} else if (client.readyState == 4 && client.status != 200) {
		    if (onComp.onFailure) onComp.onFailure();

		    ;//console.log(client.responseText);
		}
	    });
    }    

}
