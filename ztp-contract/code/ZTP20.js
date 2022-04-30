'use strict';

const CONTRACT_PRE = 'contract_info';
const ZTP_PROTOCOL = 'ztp20';

function makeAllowanceKey(owner, spender){
  return 'allow_' + owner + '_to_' + spender;
}

function approve(spender, value){
  Utils.assert(Utils.addressCheck(spender) === true, 'Arg-spender is not a valid address.');
  Utils.assert(Utils.stoI64Check(value) === true, 'Arg-value must be alphanumeric.');
  Utils.assert(Utils.int64Compare(value, '0') >= 0, 'Arg-value of spender ' + spender + ' must greater or equal to 0.');

  let key = makeAllowanceKey(Chain.msg.sender, spender);
  Chain.store(key, value);

  Chain.tlog('Approve', Chain.msg.sender, spender, value);

  return true;
}

function allowance(owner, spender){
  Utils.assert(Utils.addressCheck(owner) === true, 'Arg-owner is not a valid address.');
  Utils.assert(Utils.addressCheck(spender) === true, 'Arg-spender is not a valid address.');

  let key = makeAllowanceKey(owner, spender);
  let value = Chain.load(key);
  Utils.assert(value !== false, 'Failed to get the allowance given to ' + spender + ' by ' + owner + ' from metadata.');

  return value;
}

function transfer(to, value){
  Utils.assert(Utils.addressCheck(to) === true, 'Arg-to is not a valid address.');
  Utils.assert(Utils.stoI64Check(value) === true, 'Arg-value must be alphanumeric.');
  Utils.assert(Utils.int64Compare(value, '0') > 0, 'Arg-value must be greater than 0.');
  Utils.assert(Chain.msg.sender !== to, 'From cannot equal to address.');

  let senderValue = Chain.load(Chain.msg.sender);
  Utils.assert(senderValue !== false, 'Failed to get the balance of ' + Chain.msg.sender + ' from metadata.');
  Utils.assert(Utils.int64Compare(senderValue, value) >= 0, 'Balance:' + senderValue + ' of sender:' + Chain.msg.sender + ' < transfer value:' + value + '.');

  let toValue = Chain.load(to);
  toValue = (toValue === false) ? value : Utils.int64Add(toValue, value);
  Chain.store(to, toValue);

  senderValue = Utils.int64Sub(senderValue, value);
  Chain.store(Chain.msg.sender, senderValue);

  Chain.tlog('Transfer', Chain.msg.sender, to, value);

  return true;
}

function transferFrom(from, to, value){
  Utils.assert(Utils.addressCheck(from) === true, 'Arg-from is not a valid address.');
  Utils.assert(Utils.addressCheck(to) === true, 'Arg-to is not a valid address.');
  Utils.assert(Utils.stoI64Check(value) === true, 'Arg-value must be alphanumeric.');
  Utils.assert(Utils.int64Compare(value, '0') > 0, 'Arg-value must be greater than 0.');
  Utils.assert(from !== to, 'From cannot equal to address.');

  let fromValue = Chain.load(from);
  Utils.assert(fromValue !== false, 'Failed to get the value, probably because ' + from + ' has no value.');
  Utils.assert(Utils.int64Compare(fromValue, value) >= 0, from + ' Balance:' + fromValue + ' < transfer value:' + value + '.');

  let allowValue = allowance(from, Chain.msg.sender);
  Utils.assert(Utils.int64Compare(allowValue, value) >= 0, 'Allowance value:' + allowValue + ' < transfer value:' + value + ' from ' + from + ' to ' + to  + '.');

  let toValue = Chain.load(to);
  toValue = (toValue === false) ? value : Utils.int64Add(toValue, value);
  Chain.store(to, toValue);

  fromValue = Utils.int64Sub(fromValue, value);
  Chain.store(from, fromValue);

  let allowKey = makeAllowanceKey(from, Chain.msg.sender);
  allowValue   = Utils.int64Sub(allowValue, value);
  Chain.store(allowKey, allowValue);

  Chain.tlog('Transfer', from, to, value);

  return true;
}

function balanceOf(address){
  Utils.assert(Utils.addressCheck(address) === true, 'Arg-address is not a valid address.');
  let value = Chain.load(address);
  return value === false ? "0" : value;
}

function init(input_str){
  let paramObj = JSON.parse(input_str).params;
  Utils.assert(paramObj.name !== undefined && paramObj.name.length > 0, 'Param obj has no name.');
  Utils.assert(paramObj.symbol !== undefined && paramObj.symbol.length > 0, 'Param obj has no symbol.');
  Utils.assert(paramObj.describe !== undefined && paramObj.describe.length > 0, 'Param obj has no describe.');
  Utils.assert(paramObj.decimals !== undefined && Utils.int64Compare(paramObj.decimals, '0') >= 0, 'Param obj decimals error.');
  Utils.assert(paramObj.version !== undefined && paramObj.version.length > 0, 'Param obj has no version.');
  Utils.assert(paramObj.supply !== undefined && Utils.int64Compare(paramObj.supply, '0') >= 0, 'Param obj supply error.');
  Utils.assert(paramObj.protocol !== undefined && paramObj.protocol.length > 0 && paramObj.protocol.toLowerCase() === ZTP_PROTOCOL, 'Param obj protocol must be ztp20.');

  Chain.store(CONTRACT_PRE, JSON.stringify(paramObj));
  Chain.store(Chain.msg.sender, paramObj.supply);

  Chain.tlog('Transfer', "0x", Chain.msg.sender, paramObj.supply);
}

function main(input_str){
  let input = JSON.parse(input_str);

  if(input.method === 'transfer'){
    transfer(input.params.to, input.params.value);
  }
  else if(input.method === 'transferFrom'){
    transferFrom(input.params.from, input.params.to, input.params.value);
  }
  else if(input.method === 'approve'){
    approve(input.params.spender, input.params.value);
  }
  else{
    throw '<Main interface passes an invalid operation type>';
  }
}

function query(input_str){
  let result = {};
  let input  = JSON.parse(input_str);

  if(input.method === 'contractInfo'){
    result = JSON.parse(Chain.load(CONTRACT_PRE));
  }
  else if(input.method === 'allowance'){
    result.allowance = allowance(input.params.owner, input.params.spender);
  }
  else if(input.method === 'balanceOf'){
    result.balance = balanceOf(input.params.address);
  }
  else{
    throw '<Query interface passes an invalid operation type>';
  }
  return JSON.stringify(result);
}

