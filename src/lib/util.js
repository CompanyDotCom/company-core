import { SSM } from 'aws-sdk';

/**
 * @description Attempt to JSON.parse input value. If parse fails, return original value.
 * @param {any} v
 * @returns {any}
 */
export const parseJson = v => {
  try {
    return JSON.parse(v);
  } catch (err) {
    return v;
  }
};

const getCodeStatus = code => {
  switch (code) {
    case 200:
      return 'OK';
    case 201:
      return 'Created';
    case 400:
      return 'Bad Request';
    case 500:
      return 'Internal Server Error';
    default:
      return undefined;
  }
};

/**
 * @typedef {Object} LambdaProxyIntegrationResponse
 * @property {number} statusCode
 * @property {string} body
 */

/**
 * @description Format HTTP lambda's input, result, and response code to be comliant with Lambda proxy integration
 * @param {number} code
 * @param {*} input
 * @param {*} result
 * @returns {LambdaProxyIntegrationResponse}
 */
export const formatHttpResponse = (code, input, result) => {
  const status = getCodeStatus(code);
  const resp = `HTTP Resp: ${code}${status ? ` - ${status}` : ''}`;
  return {
    statusCode: code,
    body: JSON.stringify({
      resp,
      input,
      result
    })
  };
};

const processParams = ({ Parameters: params }) => params.reduce((result, param) => {
  const { Name: name, Value: value } = param;
  return { ...result, [name]: value };
}, {});

/**
 * @description Get AWS Parameter Store parameters in an object, formatted such that keys correspond to parameter names and values to parameter values
 * @param {string} region 
 * @param {string[]} paramNames
 * @template T
 * @returns {{}}
 */
export const getEnvParams = async (region, paramNames) => {
  const ssm = new SSM({ apiVersion: '2014-11-06', region });

  const options = {
    Names: paramNames,
    WithDecryption: true,
  };

  const params = await ssm.getParameters(options).promise();
  return processParams(params);
};

/**
 * Classis sleep function using async-await
 * @param {Number} s is the number of milliseconds to sleep
 */
 export const sleep = async s => new Promise(r => setTimeout(() => { r(); }, s));

 /**
  * Checks if the given param exists in the given object
  * @param {object} obj is the object to check if the given param exists in
  * @param {string} param is the param to check if it exists in the given obj
  * @returns {Boolean}
  */
 // eslint-disable-next-line max-len
 export const itemExists = (obj, param) => typeof obj === 'object' && obj !== null ? Object.prototype.hasOwnProperty.call(
   obj, param,
 ) : false;

export const setUserVendorIdMap = async (userId, vendorName, vendorId) => {
  if (!userId || !vendorName || !vendorId) {
    console.log('UserId, Vendor/ServiceName and the user\'s id with the vendor all all required');
    throw new Error('Cannot create vendor Id map without all required data')
  }
  await batchPutIntoDynamoDb([{
    userIdService: `${userId}-${vendorName}`,
    vendorIdService: `${vendorId}-${vendorName}`
  }], 'VendorIdUserMap');
};

export const getUserIdByVendorId = async (vendorName, vendorId) => {
  if (!vendorId || !vendorName) {
    console.log('Vendor/service name and userId are both required');
    throw new Error('Cannot fetch userId without vendorId and service name');
  }
  const records = await fetchRecordsByQuery({
    TableName: 'VendorIdUserMap',
    IndexName: 'vendorIdService-index',
    KeyConditionExpression: 'vendorIdService = :vid',
    ExpressionAttributeValues: {
    ":vid": {
        S: `${vendorId}-${vendorName}`
      },
    }
  });
  return records ? records[0] : undefined;
};
