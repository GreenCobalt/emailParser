const convert = require("encoding").convert;

let emailRgx = /[a-zA-Z0-9._%+-]*@[a-zA-Z0-9._%+-]*/;

//helper functions
function qpDecode(str) {
    let encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length,
        bufferLength = str.length - encodedBytesCount * 2,
        chr, hex,
        buffer = Buffer.alloc(bufferLength),
        bufferPos = 0;

    for (var i = 0, len = str.length; i < len; i++) {
        chr = str.charAt(i);
        if (chr == "=" && (hex = str.substr(i + 1, 2)) && /[\da-fA-F]{2}/.test(hex)) {
            buffer[bufferPos++] = parseInt(hex, 16);
            i += 2;
            continue;
        }
        buffer[bufferPos++] = chr.charCodeAt(0);
    }
    return buffer;
}
function decode(content, encoding, charset) {
    encoding = (encoding || "8bit");
    charset = (charset || "utf-8");

    if (encoding.toLowerCase() == "quoted-printable") {
        content = qpDecode(content);
    } else if (encoding.toLowerCase() == "base64") {
        content = Buffer.from(content, 'base64');
    } else {
        content = Buffer.from(content);
    }

    return convert(content, "utf8", charset);
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
            let contentType = Object.fromEntries(("type=" + part.split("Content-Type: ")[1]).replaceAll(";\n", ";").split("\n")[0].replaceAll("\t", "").split(";").map((x) => x.split("=").map((y) => y.trim().replaceAll('"', ""))));

            let encoding = (part.split("Content-Transfer-Encoding: ").length > 1 ? part.split("Content-Transfer-Encoding: ")[1].split("\n")[0] : "8bit");
            let typeSplit = contentType.type.split("/");
            typeSplit[1] = typeSplit[1].replaceAll(";", "");

            if ((typeSplit[0] == "image" || typeSplit[0] == "text" || typeSplit[0] == "image" || typeSplit[0] == "application" || typeSplit[0] == "video") && Object.keys(contentType).includes("name")) {
                let content = decode(body, encoding, contentType.charset);
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
                    charset: contentType.charset,
                    content: body,
                    decodedContent: decode(body, encoding, contentType.charset).toString("utf8")
                });
            }

        }
    });
    return email;
}

function parseEmail(body) {
    if (body.trim() == "") return false;
    body = body.replaceAll("\r\n", "\n");
    ["To", "From", "Date", "Subject"].forEach((header) => {
        if (body.split("\n" + header + ": ").length > 1) {
            return false;
        }
    });

    let email = { headers: {}, content: [], attachments: [] };
    email.headers["to"] = body.split("\nTo: ")[1].replaceAll("\n     ", "").split("\n")[0].match(/(?:[^(,)"]+|"[^"]*")+/g).map((x) => x.trim()).map((x) => { return { raw: x, parsed: x.match(emailRgx)[0] } });
    email.headers["from"] = { raw: body.split("\nFrom: ")[1].split("\n")[0], parsed: body.split("\nFrom: ")[1].split("\n")[0].match(emailRgx)[0] };
    email.headers["date"] = Date.parse(body.split("\nDate: ")[1].split("\n")[0]);
    email.headers["subject"] = body.split("\nSubject: ")[1].split("\n")[0];

    return parseSection([body], email);
}

module.exports = { parseEmail }