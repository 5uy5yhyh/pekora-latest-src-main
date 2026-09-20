import { RCCRequest } from "../Utilities/Libraries/Request.js";
import xml2js from "xml2js";
import { Console } from "../Utilities/Libraries/CS.js";
import Resp from "../Utilities/Libraries/Resp.js";
export const RequestRCCBase = async (req, res, xml, port, type, envelopeType) => {
    const request = req.body;
    const response = await RCCRequest(port, xml, request.jobExpiration);
    LogRccResponse(response);
    try {
        let xmlData;
        let result = (await xml2js.parseStringPromise(response, { explicitArray: false }))["SOAP-ENV:Envelope"];
        result = CleanXmlJson(result);
        xmlData =
            result?.Body?.BatchJobResponse?.BatchJobResult?.value;
        if (!xmlData) {
            result = result;
            xmlData =
                result.Body.BatchJobResponse.BatchJobResult[0].value;
        }
        Console.Log(`&aRendered &lsuccessfully&r&a on port &l${port}&r with UserId &l${request.userId}&r, &lAssetId ${request.assetId}&r.`);
        return Resp(res, 200, "success", true, { data: xmlData });
    }
    catch (e) {
        const message = e?.message || String(e);
        if (message.startsWith("Non-whitespace before first tag.")) {
            Console.Error(`${type} render with &c&lUserId ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message, likely due to a malformed XML provided to RCC:\n${message}`);
        }
        else {
            Console.Error(`${type} render with &c&lUserId ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message:\n${message}`);
        }
        return Resp(res, 500, message);
    }
};
export const RequestRCCBaseXMLData = async (req, res, xml, port, type, envelopeType) => {
    const request = req.body;
    const response = await RCCRequest(port, xml, request.jobExpiration);
    LogRccResponse(response);
    try {
        let xmlData;
        let result = (await xml2js.parseStringPromise(response, { explicitArray: false }))["SOAP-ENV:Envelope"];
        switch (envelopeType) {
            case 2:
                result = CleanXmlJson(result);
                xmlData =
                    result.Body.BatchJobResponse.BatchJobResult.value;
                break;
            default:
                result = result;
                xmlData =
                    result.Body.BatchJobResponse.BatchJobResult[0].value;
                break;
        }
        Console.Log(`&aRendered &lsuccessfully&r&a on port &l${port}&r with ${request.userId}&r, &c&lAssetId ${request.assetId}&r.`);
        return xmlData;
    }
    catch (e) {
        const message = e?.message || String(e);
        if (message.startsWith("Non-whitespace before first tag.")) {
            Console.Error(`${type} render with &c&lUserId ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message, likely due to a malformed XML provided to RCC:\n${message}`);
        }
        else {
            Console.Error(`${type} render with ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message:\n${message}`);
        }
        return Resp(res, 500, message);
    }
};
function LogRccResponse(response) {
    try {
        if (typeof response === "string") {
            Console.Error(`[RCC RAW RESPONSE] ${response}`);
            return;
        }
        if (response === null || response === undefined) {
            Console.Error("[RCC RAW RESPONSE] null");
            return;
        }
        if (response.data !== undefined) {
            if (typeof response.data === "string") {
                Console.Error(`[RCC RAW RESPONSE DATA] ${response.data}`);
            }
            else {
                Console.Error(`[RCC RAW RESPONSE DATA] ${String(response.data)}`);
            }
            if (response.status !== undefined) {
                Console.Error(`[RCC HTTP STATUS] ${String(response.status)}`);
            }
            return;
        }
        if (response.status !== undefined) {
            Console.Error(`[RCC HTTP STATUS] ${String(response.status)}`);
        }
        Console.Error(`[RCC RAW RESPONSE TYPE] ${typeof response}`);
    }
    catch (e) {
        Console.Error(`[RCC RESPONSE LOG ERROR] ${e?.message || String(e)}`);
    }
}
export class BaseJson {
    Mode;
    Settings;
    Arguments;
}
function CleanXmlJson(obj) {
    if (Array.isArray(obj)) {
        return obj.map(CleanXmlJson);
    }
    if (typeof obj === "object" && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            if (key === "$") {
                continue;
            }
            const cleanedKey = key.includes(":")
                ? key.split(":")[1]
                : key;
            newObj[cleanedKey] = CleanXmlJson(obj[key]);
        }
        return newObj;
    }
    return obj;
}
