import { v4 as uuidv4 } from "uuid";

export const SOAP = (
    baseUrl: string,
    jobExpiration: number,
    finalScript: string
) => {
    const jobId = uuidv4();
    const scriptName = uuidv4();

    return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:rob="http://projex.zip/">
    <SOAP-ENV:Header/>
    <SOAP-ENV:Body SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <rob:BatchJob>
            <rob:job>
                <rob:id>${jobId}</rob:id>
                <rob:expirationInSeconds>${jobExpiration}</rob:expirationInSeconds>
                <rob:cores>1</rob:cores>
            </rob:job>
            <rob:script>
                <rob:name>${scriptName}</rob:name>
                <rob:script><![CDATA[
${finalScript}
                ]]></rob:script>
            </rob:script>
        </rob:BatchJob>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
};