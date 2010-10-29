
HashMap = function(){
  this._dict = [];
}
exports.Hash = HashMap;

HashMap.prototype._get = function(key){
  for(var i=0, couplet; couplet = this._dict[i]; i++){
    if(couplet[0] === key){
      return couplet;
    }
  }
}
HashMap.prototype.set = function(key, value){
  var couplet = this._get(key);
  if(couplet){
    couplet[1] = value;
  }else{
    this._dict.push([key, value]);
  }
  return this; // for chaining
}
HashMap.prototype.get = function(key){
  var couplet = this._get(key);
  if(couplet){
    return couplet[1];
  }
}

HashMap.prototype.each = function() {
    
}