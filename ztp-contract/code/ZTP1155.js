'use strict';

const ASSET_PRE = 'asset';
const BALANCE_PRE = 'balance';
const APPROVE_PRE = 'approve';
const CONTRACT_PRE = 'contract_info';
const ZTP_PROTOCOL = 'ztp1155';

function _isHexStr64(str){
  let a = /^[A-Fa-f0-9]{64,64}$/;
  return a.test(str);
}

function loadObj(key){
  let data = Chain.load(key);
  Utils.assert(data !== false, 'Failed to get storage data, key:' + key);
  return JSON.parse(data);
}

function saveObj(key, value){
  Chain.store(key, JSON.stringify(value));
}

function getBalance(key){
  let data = Chain.load(key);
  if(data === false){
    return '0';
  }

  return JSON.parse(data).value;
}

function saveBalance(key, value){
  let balanceObj = {};
  balanceObj.value = value;
  saveObj(key, balanceObj);
}

function getApproved(key){
  let data = Chain.load(key);
  if(data === false){
    return false;
  }

  return JSON.parse(data).approved;
}

function saveApproved(key, value){
  let approvedObj = {};
  approvedObj.approved = value;
  saveObj(key, approvedObj);
}

function getKey(first, second, third = ''){
  return (third === '') ? (first + '_' + second) : (first + '_' + second + '_' + third);
}

function _transFrom(id, from, to, value, data){
  // Check if the account has assets or is approved
  Utils.assert(_isHexStr64(id) === true, 'Id must be 64 length hex str.');
  Utils.assert(Chain.load(getKey(ASSET_PRE, id)) !== false, 'Check nft not exsit.');
  let approved = getApproved(getKey(APPROVE_PRE, from, Chain.msg.sender));
  Utils.assert(Chain.msg.sender === from || approved === true, 'No privilege to trans.');
  let rawFromValue = getBalance(getKey(BALANCE_PRE, id, from));
  let rawToValue = getBalance(getKey(BALANCE_PRE, id, to));
  Utils.assert(Utils.int64Compare(rawFromValue, value) >= 0, 'Balance:' + rawFromValue + ' of sender:' + Chain.msg.sender + ' < transfer value:' + value + '.');
  
  let fromValue = Utils.int64Sub(rawFromValue, value);
  let toValue = Utils.int64Add(rawToValue, value);
  // Transfer assets and keep records
  saveBalance(getKey(BALANCE_PRE, id, to), toValue);
  if(Utils.int64Compare(fromValue, '0') === 0){
    Chain.del(getKey(BALANCE_PRE, id, from));
  }
  else{
    saveBalance(getKey(BALANCE_PRE, id, from), fromValue);
  }

}

function safeTransferFrom(paramObj)
{
  Utils.assert(paramObj.from !== undefined && paramObj.from.length > 0, 'Param obj has no from.');
  Utils.assert(paramObj.to !== undefined && paramObj.to.length > 0, 'Param obj has no to.');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(paramObj.value !== undefined && paramObj.value.length > 0, 'Param obj has no value.');
  Utils.assert(paramObj.data !== undefined && paramObj.data.length >= 0, 'Param obj has no data.');
  Utils.assert(Utils.addressCheck(paramObj.from), 'From address is invalid.');
  Utils.assert(Utils.addressCheck(paramObj.to), 'To address is invalid.');
  Utils.assert(paramObj.from !== paramObj.to, 'From cannot equal to address.');
  Utils.assert(Utils.int64Compare(paramObj.value, 0) > 0, 'Value must greater than 0.');

  _transFrom(paramObj.id, paramObj.from, paramObj.to, paramObj.value, paramObj.data);

  Chain.tlog('TransferSingle', Chain.msg.sender, paramObj.from, paramObj.to, paramObj.id, paramObj.value);
}

function safeBatchTransferFrom(paramObj)
{
  Utils.assert(paramObj.from !== undefined && paramObj.from.length > 0, 'Param obj has no from.');
  Utils.assert(paramObj.to !== undefined && paramObj.to.length > 0, 'Param obj has no to.');
  Utils.assert(paramObj.ids !== undefined && paramObj.ids.length > 0, 'Param obj has no ids.');
  Utils.assert(paramObj.values !== undefined && paramObj.values.length > 0, 'Param obj has no values.');
  Utils.assert(paramObj.datas !== undefined && paramObj.datas.length > 0, 'Param obj has no datas.');
  Utils.assert(Utils.addressCheck(paramObj.from), 'From address is invalid.');
  Utils.assert(Utils.addressCheck(paramObj.to), 'To address is invalid.');
  Utils.assert(paramObj.from !== paramObj.to, 'From cannot equal to address.');
  Utils.assert(paramObj.ids.length === paramObj.values.length, 'Ids not equal values with length.');
  Utils.assert(paramObj.ids.length === paramObj.datas.length, 'Ids not equal datas with length.');
  Utils.assert(paramObj.values.length === paramObj.datas.length, 'Values not equal datas with length.');

  let i = 0;
  for (i = 0; i < paramObj.ids.length; i += 1) {
    _transFrom(paramObj.ids[i], paramObj.from, paramObj.to, paramObj.values[i], paramObj.datas[i]);
  }

  Chain.tlog('TransferBatch', Chain.msg.sender, paramObj.from, paramObj.to, JSON.stringify(paramObj.ids), JSON.stringify(paramObj.values));
}

function setApprovalForAll(paramObj)
{
  Utils.assert(paramObj.operator !== undefined && paramObj.operator.length > 0, 'Param obj has no operator.');
  Utils.assert(paramObj.approved !== undefined, 'Param obj has no approved.');
  Utils.assert(paramObj.approved === true || paramObj.approved === false, 'Approved must be true or false.');
  Utils.assert(Utils.addressCheck(paramObj.operator), 'Operator address is invalid.');
  Utils.assert(Chain.msg.sender !== paramObj.operator, 'Operator cannot equal msg sender.');
  
  saveApproved(getKey(APPROVE_PRE, Chain.msg.sender, paramObj.operator), paramObj.approved);

  Chain.tlog('ApprovalForAll', Chain.msg.sender, paramObj.operator, paramObj.approved);
}

function _mint(id, to, uri, value){
  Utils.assert(_isHexStr64(id) === true, 'Id must be 64 length hex str.');
  Utils.assert(Utils.stoI64Check(value) === true, 'Param value error.');
  Utils.assert(Utils.int64Compare(value, 0) > 0, 'Param value error.');
  Utils.assert(uri !== undefined && uri.length > 0, 'Param obj has no uri.');
  Utils.assert(Chain.load(getKey(ASSET_PRE, id)) === false, 'Check nft already exsit.');
  let nftObj = {};
  nftObj.id = id;
  nftObj.issuer = Chain.msg.sender;
  nftObj.uri = uri;
  nftObj.value = value;
  saveObj(getKey(ASSET_PRE, id), nftObj);
  saveBalance(getKey(BALANCE_PRE, id, to), value);
}

function mint(paramObj)
{
  Utils.assert(paramObj.to !== undefined && paramObj.to.length > 0, 'Param obj has no to.');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(paramObj.value !== undefined && paramObj.value.length > 0, 'Param obj has no value.');
  Utils.assert(paramObj.uri !== undefined && paramObj.uri.length > 0, 'Param obj has no uri.');
  Utils.assert(Utils.addressCheck(paramObj.to), 'To address is invalid.');
  
  _mint(paramObj.id, paramObj.to, paramObj.uri, paramObj.value);

  Chain.tlog('TransferSingle', Chain.msg.sender, '0x', paramObj.to, paramObj.id, paramObj.value);
}

function _burn(id, from, value){
  Utils.assert(_isHexStr64(id) === true, 'Id must be 64 length hex str.');
  Utils.assert(Chain.load(getKey(ASSET_PRE, id)) !== false, 'Check nft not exsit.');
  Utils.assert(Utils.int64Compare(value, 0) > 0, 'Value must greater than 0.');

  let approved = getApproved(getKey(APPROVE_PRE, from, Chain.msg.sender));
  Utils.assert(Chain.msg.sender === from || approved === true, 'No privilege to trans.');
  let rawFromValue = getBalance(getKey(BALANCE_PRE, id, from));
  Utils.assert(Utils.int64Compare(rawFromValue, value) >= 0, 'Balance:' + rawFromValue + ' of sender:' + Chain.msg.sender + ' < transfer value:' + value + '.');
  
  let fromValue = Utils.int64Sub(rawFromValue, value);

  if(Utils.int64Compare(fromValue, '0') === 0){
    Chain.del(getKey(BALANCE_PRE, id, from));
  }
  else{
    saveBalance(getKey(BALANCE_PRE, id, from), fromValue);
  }
}

function burn(paramObj)
{

  Utils.assert(paramObj.from !== undefined && paramObj.from.length > 0, 'Param obj has no from.');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(paramObj.value !== undefined && paramObj.value.length > 0, 'Param obj has no value.');
  Utils.assert(Utils.addressCheck(paramObj.from), 'From address is invalid.');
 
  _burn(paramObj.id, paramObj.from, paramObj.value);

  Chain.tlog('TransferSingle', Chain.msg.sender, paramObj.from, '0x', paramObj.id, paramObj.value);
}

function balanceOf(paramObj)
{

  Utils.assert(paramObj.owner !== undefined && paramObj.owner.length > 0, 'Param obj has no owner');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id');

  let result = {};
  result.balance = getBalance(getKey(BALANCE_PRE, paramObj.id, paramObj.owner));
  return result;
}

function balanceOfBatch(paramObj)
{

  Utils.assert(paramObj.owners !== undefined && paramObj.owners.length > 0, 'Param obj has no owners.');
  Utils.assert(paramObj.ids !== undefined && paramObj.ids.length > 0, 'Param obj has no ids.');
  Utils.assert(paramObj.ids.length === paramObj.owners.length, 'Ids not equal owners with length.');

  let result = {};
  result.balances = [];
  let i = 0;
  for (i = 0; i < paramObj.ids.length; i += 1) {
    result.balances.push(getBalance(getKey(BALANCE_PRE, paramObj.ids[i], paramObj.owners[i])));
  }

  return result;
}

function isApprovedForAll(paramObj)
{

  Utils.assert(paramObj.owner !== undefined && paramObj.owner.length > 0, 'Param obj has no owner.');
  Utils.assert(paramObj.operator !== undefined && paramObj.operator.length > 0, 'Param obj has no operator.');

  let approvedObj = {};
  approvedObj.approved = getApproved(getKey(APPROVE_PRE, paramObj.owner, paramObj.operator));
  return approvedObj;
}

function contractInfo()
{
  return loadObj(CONTRACT_PRE);
}

function uri(paramObj)
{
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  let uriObj = {};
  uriObj.uri = loadObj(getKey(ASSET_PRE, paramObj.id)).uri;
  return uriObj;
}

function init(input_str)
{
  let paramObj = JSON.parse(input_str).params;
  Utils.assert(paramObj.name !== undefined && paramObj.name.length > 0, 'Param obj has no name.');
  Utils.assert(paramObj.symbol !== undefined && paramObj.symbol.length > 0, 'Param obj has no symbol.');
  Utils.assert(paramObj.describe !== undefined && paramObj.describe.length > 0, 'Param obj has no describe.');
  Utils.assert(paramObj.protocol !== undefined && paramObj.protocol.length > 0 && paramObj.protocol.toLowerCase() === ZTP_PROTOCOL, 'Param obj protocol must be ztp1155.');
  Utils.assert(paramObj.version !== undefined && paramObj.version.length > 0, 'Param obj has no version.');
  Utils.assert(paramObj.url !== undefined && paramObj.url.length > 0, 'Param obj has no url.');

  saveObj(CONTRACT_PRE, paramObj);
  return;
}

function main(input_str)
{
  let funcList = {
    'safeTransferFrom' : safeTransferFrom,
    'safeBatchTransferFrom' : safeBatchTransferFrom,
    'setApprovalForAll' : setApprovalForAll,
    'mint' : mint,
    'burn' : burn
  };
  let inputObj = JSON.parse(input_str);
  Utils.assert(funcList.hasOwnProperty(inputObj.method) && typeof funcList[inputObj.method] === 'function', 'Cannot find func:' + inputObj.method);
  funcList[inputObj.method](inputObj.params);
}

function query(input_str)
{
    let funcList = {
      'balanceOf' : balanceOf,
      'balanceOfBatch' : balanceOfBatch,
      'isApprovedForAll' : isApprovedForAll,
      'contractInfo' : contractInfo,
      'uri': uri
    };
    let inputObj = JSON.parse(input_str);
    Utils.assert(funcList.hasOwnProperty(inputObj.method) && typeof funcList[inputObj.method] === 'function', 'Cannot find func:' + inputObj.method);
    return JSON.stringify(funcList[inputObj.method](inputObj.params));
}
