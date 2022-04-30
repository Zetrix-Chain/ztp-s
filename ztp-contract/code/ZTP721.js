'use strict';

const ASSET_PRE = 'asset';
const ASSET_USER_COUNT_PRE = 'asset_user_count';
const ASSET_OWNER_PRE = 'asset_owner';
const APPROVE_SINGLE_PRE = 'approve_single';
const APPROVE_ALL_PRE = 'approve_all';
const CONTRACT_PRE = 'contract_info';
const ASSET_SUPPLY = 'asset_supply';
const ZTP_PROTOCOL = 'ztp721';

function getKey(first, second, third = ''){
  return (third === '') ? (first + '_' + second) : (first + '_' + second + '_' + third);
}

function loadObj(key){
  let data = Chain.load(key);
  Utils.assert(data !== false, 'Failed to get storage data, key:' + key);
  return JSON.parse(data);
}

function saveObj(key, value){
  Chain.store(key, JSON.stringify(value));
}

function checkAssetExsit(id){
  let data = Chain.load(getKey(ASSET_PRE, id));
  if(data === false){
    return false;
  }

  return true;
}

function saveAsset(id, issuer, uri){
  let nftObj = {};
  nftObj.id = id;
  nftObj.issuer = issuer;
  nftObj.uri = uri;
  saveObj(getKey(ASSET_PRE, id), nftObj);
}

function getAssetOwner(id){
  let data = Chain.load(getKey(ASSET_OWNER_PRE, id));
  if(data === false){
    return '';
  }

  return JSON.parse(data).owner;
}

function saveAssetOwner(id, owner){
  let obj = {};
  obj.owner = owner;
  saveObj(getKey(ASSET_OWNER_PRE, id), obj);
}

function getAssetUserCount(user){
  let data = Chain.load(getKey(ASSET_USER_COUNT_PRE, user));
  if(data === false){
    return '0';
  }

  return JSON.parse(data).count;
}

function saveAssetUserCount(user, count){
  let key = getKey(ASSET_USER_COUNT_PRE, user);
  if(Utils.int64Compare(count, '0') !== 0){
    let obj = {};
    obj.count = count;
    saveObj(key, obj);
    return;
  }

  let data = Chain.load(key);
  if(data !== false){
    Chain.del(key);
  }
}

function getApproveSingle(id){
  let data = Chain.load(getKey(APPROVE_SINGLE_PRE, id));
  if(data === false){
    return '';
  }

  return JSON.parse(data).operator;
}

function saveApproveSingle(id, operator){
  let obj = {};
  obj.operator = operator;
  saveObj(getKey(APPROVE_SINGLE_PRE, id), obj);
}

function delApproveSingle(id){
  let key = getKey(APPROVE_SINGLE_PRE, id);
  let data = Chain.load(key);
  if(data === false){
    return false;
  }
  Chain.del(key);
  return true;
}

function getApproveAll(owner, operator){
  let data = Chain.load(getKey(APPROVE_ALL_PRE, owner, operator));
  if(data === false){
    return false;
  }

  return JSON.parse(data).approved;
}

function saveApproveAll(owner, operator, approved){
  let key = getKey(APPROVE_ALL_PRE, owner, operator);
  if(approved){
    let approvedObj = {};
    approvedObj.approved = approved;
    saveObj(key, approvedObj);
    return;
  }

  let data = Chain.load(key);
  if(data !== false){
    Chain.del(key);
  }
}

function getAssetSupply(){
  let data = Chain.load(ASSET_SUPPLY);
  if(data === false){
    return '0';
  }

  return JSON.parse(data).count;
}

function saveAssetSupply(count){
  let supplyObj = {};
  supplyObj.count = count;
  saveObj(ASSET_SUPPLY, supplyObj);
}

function _approve(owner, id, approved){
  if(approved !== ''){
    saveApproveSingle(id, approved);
    Chain.tlog('Approval', owner, approved, id);
    return;
  }

  if(delApproveSingle(id)){
    Chain.tlog('Approval', owner, '0x', id);
    return;
  }
}

function _transFrom(id, from, to){
  Utils.assert(checkAssetExsit(id), 'Check nft not exsit.');

  let owner = getAssetOwner(id);
  Utils.assert(owner === from, 'Nft owner not equal from.');
  Utils.assert(owner === Chain.msg.sender || getApproveSingle(id) === Chain.msg.sender || getApproveAll(owner, Chain.msg.sender), 'No privilege to trans.');

  saveAssetUserCount(from, Utils.int64Sub(getAssetUserCount(from), '1'));
  saveAssetUserCount(to, Utils.int64Add(getAssetUserCount(to), '1'));

  saveAssetOwner(id, to);

  _approve(owner, id, '');

   Chain.tlog('Transfer', owner, to, id);

  return;
}

function safeTransferFrom(paramObj)
{

  Utils.assert(paramObj.from !== undefined && paramObj.from.length > 0, 'Param obj has no from.');
  Utils.assert(paramObj.to !== undefined && paramObj.to.length > 0, 'Param obj has no to.');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(Utils.addressCheck(paramObj.from), 'From address is invalid.');
  Utils.assert(Utils.addressCheck(paramObj.to), 'To address is invalid.');

  _transFrom(paramObj.id, paramObj.from, paramObj.to);
  return;
}

function transferFrom(paramObj)
{

  Utils.assert(paramObj.from !== undefined && paramObj.from.length > 0, 'Param obj has no from.');
  Utils.assert(paramObj.to !== undefined && paramObj.to.length > 0, 'Param obj has no to.');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(Utils.addressCheck(paramObj.from), 'From address is invalid.');
  Utils.assert(Utils.addressCheck(paramObj.to), 'To address is invalid.');

  _transFrom(paramObj.id, paramObj.from, paramObj.to);
  return;
}

function approve(paramObj)
{

  Utils.assert(paramObj.approved !== undefined && paramObj.approved.length >= 0, 'Param obj has no approved.');
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(Utils.addressCheck(paramObj.approved) || paramObj.approved === '', 'Approved address is invalid.');
  Utils.assert(Chain.msg.sender !== paramObj.approved, 'Approved cannot equal msg sender.');
  Utils.assert(checkAssetExsit(paramObj.id), 'Check nft not exsit.');
  let owner = getAssetOwner(paramObj.id);
  Utils.assert(owner === Chain.msg.sender, 'No privilege to trans.');
  
  _approve(owner, paramObj.id, paramObj.approved);
  return;
}

function setApprovalForAll(paramObj)
{

  Utils.assert(paramObj.operator !== undefined && paramObj.operator.length > 0, 'Param obj has no operator.');
  Utils.assert(paramObj.approved !== undefined, 'Param obj has no approved.');
  Utils.assert(paramObj.approved === true || paramObj.approved === false, 'Approved must be true or false.');
  Utils.assert(Utils.addressCheck(paramObj.operator), 'Operator address is invalid.');
  Utils.assert(Chain.msg.sender !== paramObj.operator, 'Operator cannot equal msg sender.');
  
  saveApproveAll(Chain.msg.sender, paramObj.operator, paramObj.approved);

  Chain.tlog('ApprovalForAll', Chain.msg.sender, paramObj.operator, paramObj.approved);
  return;
}

function mint(paramObj)
{

  Utils.assert(paramObj.to !== undefined && paramObj.to.length > 0, 'Param obj has no to.');
  Utils.assert(paramObj.uri !== undefined && paramObj.uri.length > 0, 'Param obj has no uri.');
  Utils.assert(Utils.addressCheck(paramObj.to), 'To address is invalid.');
  
  let newId = Utils.int64Add(getAssetSupply(), '1');
  let newUserCount =  Utils.int64Add(getAssetUserCount(paramObj.to), '1');
  saveAsset(newId, Chain.msg.sender, paramObj.uri);
  saveAssetOwner(newId, paramObj.to);
  saveAssetUserCount(paramObj.to, newUserCount);
  saveAssetSupply(newId);

  Chain.tlog('Transfer', '0x', paramObj.to, newId);
  return;
}

function burn(paramObj)
{
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  Utils.assert(checkAssetExsit(paramObj.id), 'Check nft not exsit.');

  let owner = getAssetOwner(paramObj.id);
  Utils.assert(owner === Chain.msg.sender || getApproveSingle(paramObj.id) === Chain.msg.sender || getApproveAll(owner, Chain.msg.sender), 'No privilege to burn.');

  saveAssetUserCount(owner, Utils.int64Sub(getAssetUserCount(owner), '1'));

  saveAssetOwner(paramObj.id, '');

  _approve(owner, paramObj.id, '');

  Chain.tlog('Transfer', owner, '0x', paramObj.id);
  return;
}

function balanceOf(paramObj)
{

  Utils.assert(paramObj.owner !== undefined && paramObj.owner.length > 0, 'Param obj has no owner');

  let result = {};
  result.count = getAssetUserCount(paramObj.owner);
  return result;
}

function ownerOf(paramObj)
{

  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');

  let result = {};
  result.address = getAssetOwner(paramObj.id);
  return result;
}

function getApproved(paramObj){

  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');

  let result = {};
  result.address = getApproveSingle(paramObj.id);
  return result;
}

function isApprovedForAll(paramObj)
{

  Utils.assert(paramObj.owner !== undefined && paramObj.owner.length > 0, 'Param obj has no owner.');
  Utils.assert(paramObj.operator !== undefined && paramObj.operator.length > 0, 'Param obj has no operator.');

  let result = {};
  result.approved = getApproveAll(paramObj.owner, paramObj.operator);
  return result;
}

function contractInfo()
{
  return loadObj(CONTRACT_PRE);
}

function tokenURI(paramObj)
{
  Utils.assert(paramObj.id !== undefined && paramObj.id.length > 0, 'Param obj has no id.');
  let result = {};
  result.uri = loadObj(getKey(ASSET_PRE, paramObj.id)).uri;
  return result;
}

function totalSupply(paramObj)
{
  let result = {};
  result.count = getAssetSupply();
  return result;
}

function init(input_str)
{
  let paramObj = JSON.parse(input_str).params;
  Utils.assert(paramObj.name !== undefined && paramObj.name.length > 0, 'Param obj has no name.');
  Utils.assert(paramObj.symbol !== undefined && paramObj.symbol.length > 0, 'Param obj has no symbol.');
  Utils.assert(paramObj.describe !== undefined && paramObj.describe.length > 0, 'Param obj has no describe.');
  Utils.assert(paramObj.protocol !== undefined && paramObj.protocol.length > 0 && paramObj.protocol.toLowerCase() === ZTP_PROTOCOL, 'Param obj protocol must be ZTP721.');
  Utils.assert(paramObj.version !== undefined && paramObj.version.length > 0, 'Param obj has no version.');
  Utils.assert(paramObj.url !== undefined && paramObj.url.length > 0, 'Param obj has no url.');

  saveObj(CONTRACT_PRE, paramObj);
  return;
}

function main(input_str)
{
  let funcList = {
    'safeTransferFrom' : safeTransferFrom,
    'transferFrom' : transferFrom,
    'approve' : approve,
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
      'ownerOf' : ownerOf,
      'getApproved' : getApproved,
      'isApprovedForAll' : isApprovedForAll,
      'contractInfo' : contractInfo,
      'tokenURI': tokenURI,
      'totalSupply': totalSupply
    };
    let inputObj = JSON.parse(input_str);
    Utils.assert(funcList.hasOwnProperty(inputObj.method) && typeof funcList[inputObj.method] === 'function', 'Cannot find func:' + inputObj.method);
    return JSON.stringify(funcList[inputObj.method](inputObj.params));
}
