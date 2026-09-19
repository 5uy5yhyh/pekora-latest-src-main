import { RCCRequest } from "../Utilities/Libraries/Request.js";
import xml2js from "xml2js";
import { Console } from "../Utilities/Libraries/CS.js";
import Resp from "../Utilities/Libraries/Resp.js";
export const RequestRCCBase = async (req, res, xml, port, type, envelopeType) => {
    const request = req.body;
    const response = await RCCRequest(port, xml, request.jobExpiration);
    try {
        let xmlData;
        let result = (await xml2js.parseStringPromise(response, { explicitArray: false }))["SOAP-ENV:Envelope"];
        result = CleanXmlJson(result);
        xmlData = result?.Body?.BatchJobResponse?.BatchJobResult?.value;
        if (!xmlData) {
            result = result;
            xmlData = result.Body.BatchJobResponse.BatchJobResult[0].value;
        }
        Console.Log(`&aRendered &lsuccessfully&r&a on port &l${port}&r with UserId &l${request.userId}&r, &lAssetId ${request.assetId}&r.`);
        // return res.status(200).set("Content-Type", "image/png").send(Buffer.from(xmlData, "base64"));
        return Resp(res, 200, "success", true, { data: xmlData });
    }
    catch (e) {
        if (e.message.startsWith("Non-whitespace before first tag.")) {
            Console.Error(`${type} render with &c&lUserId ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message, likely due to a malformed XML provided to RCC: \n${e.message}`);
        }
        else {
            Console.Error(`${type} render with &c&lUserId ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message: \n${e.message}`);
        }
        return Resp(res, 500, e.message);
    }
};
export const RequestRCCBaseXMLData = async (req, res, xml, port, type, envelopeType) => {
    const request = req.body;
    const response = await RCCRequest(port, xml, request.jobExpiration);
    try {
        let xmlData;
        let result = (await xml2js.parseStringPromise(response, { explicitArray: false }))["SOAP-ENV:Envelope"];
        switch (envelopeType) {
            case 2:
                result = CleanXmlJson(result);
                xmlData = result.Body.BatchJobResponse.BatchJobResult.value;
                break;
            default:
                result = result;
                xmlData = result.Body.BatchJobResponse.BatchJobResult[0].value;
                break;
        }
        Console.Log(`&aRendered &lsuccessfully&r&a on port &l${port}&r with ${request.userId}&r, &c&lAssetId ${request.assetId}&r.`);
        return xmlData;
    }
    catch (e) {
        if (e.message.startsWith("Non-whitespace before first tag.")) {
            Console.Error(`${type} render with &c&lUserId ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message, likely due to a malformed XML provided to RCC: \n${e.message}`);
        }
        else {
            Console.Error(`${type} render with ${request.userId}&r, &c&lAssetId ${request.assetId}&r on &c&lport ${port}&r failed with the following error message: \n${e.message}`);
        }
        return Resp(res, 500, e.message);
    }
};
export class BaseJson {
    Mode;
    Settings;
    Arguments;
}
function CleanXmlJson(obj) {
    if (Array.isArray(obj)) {
        return obj.map(CleanXmlJson);
    }
    else if (typeof obj === "object" && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            if (key === "$")
                continue;
            const cleanedKey = key.includes(":") ? key.split(":")[1] : key;
            newObj[cleanedKey] = CleanXmlJson(obj[key]);
        }
        return newObj;
    }
    return obj;
}
