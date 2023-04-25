const mimelib = require("mimelib");

let emailRgx = /[a-zA-Z0-9._%+-]*@[a-zA-Z0-9._%+-]*/;
let wantedHeaders = ["To", "From", "Date", "Subject"];

//helper functions
function decode(content, encoding = "8bit") {
    if (encoding.toLowerCase() == "quoted-printable" || content.includes("=20")) {
        content = Buffer.from(mimelib.decodeQuotedPrintable(content), "utf8");
    } else if (encoding.toLowerCase() == "base64") {
        content = Buffer.from(content, 'base64');
    } else {
        content = Buffer.from(content, "utf8");
    }
    return content;
}
function getTextInBoundary(text, boundary) {
    return text.split("--" + boundary + "--")[0].split("--" + boundary + "\n").slice(1);
}
function getBoundaryFromText(text) {
    return text.split("Content-Type: ")[1].split("y=")[1].split("\n")[0].replaceAll('";', '').replaceAll('"', '').replaceAll("\n", "");
}

function parseSection(section, email) {
    section.forEach((part) => {
        let partType = part.split("Content-Type: ")[1].split("\n")[0].split("; ");
        if (partType[0].split("/")[0] == "multipart") {
            parseSection(getTextInBoundary(part, getBoundaryFromText(part)), email);
        } else {
            let body = part.split("\n\n")[1].replaceAll("\n", "").trim();
            let contentType = Object.fromEntries(("type=" + part.split("Content-Type: ")[1]).split("\n")[0].split("; ").map((x) => x.split("=")));

            let encoding = (part.split("Content-Transfer-Encoding: ").length > 1 ? part.split("Content-Transfer-Encoding: ")[1].split("\n")[0] : "8bit");
            let typeSplit = contentType.type.split("/");
            
            if ((typeSplit[0] == "image" || typeSplit[0] == "text" || typeSplit[0] == "image" || typeSplit[0] == "application" || typeSplit[0] == "video") && Object.keys(contentType).includes("name")) {
                let content = decode(body, encoding);
                email.attachments.push({
                    type: contentType.type,
                    name: contentType.name.replaceAll('"', ''),
                    id: (part.split("Content-ID: ").length > 1 ? part.split("Content-ID: ")[1].split("\n")[0] : null),
                    content: content
                });
            } else if (typeSplit[0] == "text") {
                email.content.push({
                    type: contentType.type,
                    encoding: encoding,
                    content: body,
                    decodedContent: decode(body, encoding).toString("utf8")
                });
            }
            
        }
    });
    return email;
}

function parseEmail(body) {
    if (body == "") return false;
    body = body.replaceAll("\r\n", "\n");
    wantedHeaders.forEach((header) => {
        if (body.split("\n" + header + ": ").length > 1) {
            return false;
        }
    });

    let email = { headers: {}, content: [], attachments: [] };
    email.headers["to"] = body.split("\nTo: ")[1].split("\n")[0].split(", ").map((x) => { return { raw: x, parsed: x.match(emailRgx)[0] } });
    email.headers["from"] = { raw: body.split("\nFrom: ")[1].split("\n")[0], parsed: body.split("\nFrom: ")[1].split("\n")[0].match(emailRgx)[0] };
    email.headers["date"] = Date.parse(body.split("\nDate: ")[1].split("\n")[0]);
    email.headers["subject"] = body.split("\nSubject: ")[1].split("\n")[0];

    return parseSection(getTextInBoundary(body, getBoundaryFromText(body)), email);
}

module.exports = { parseEmail }