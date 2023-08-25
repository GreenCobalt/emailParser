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

function parseListOfEmails(text) {
    return text.match(/(?:[^,"]+|"[^"]*")+/g/* splits by comma if comma not in quotes */).map(x => { return { raw: x.trim(), parsed: x.trim().match(emailRgx)[0] } });
}
function getHeaders(text) {
    let headers = {};
    Array.from(text.split("\n\n")[0].matchAll(/\n?(?<n>[^:]*): ?(?<c>([^\n]|\n\s)*)/gm)).forEach((match) => {
        if (Object.keys(headers).includes(match.groups.n)) {
            if (!Array.isArray(headers[match.groups.n])) headers[match.groups.n] = [headers[match.groups.n]];
            headers[match.groups.n].push(match.groups.c);
        } else {
            headers[match.groups.n] = match.groups.c.replaceAll(/\n\s+/g, "");
        }
    });
    return headers;
}
function getTextInBoundary(text, boundary) {
    return text.split("--" + boundary + "--")[0].split("--" + boundary + "\n").slice(1);
}
function getBoundaryFromText(text) {
    return text.split("Content-Type: ")[1].split("y=")[1].split("\n")[0].replaceAll('";', '').replaceAll('"', '').replaceAll("\n", "");
}

function parseSection(section, email) {
    section.forEach((part) => {
        let partHeaders = getHeaders(part);
        if (!("Content-Type" in partHeaders)) return email;
        let partType = partHeaders["Content-Type"].split("; ");

        if (partType[0].split("/")[0] == "multipart") {
            email = parseSection(getTextInBoundary(part, getBoundaryFromText(part)), email);
        } else {
            let body = part.slice(part.indexOf('\n\n') + 1).replaceAll("=\n", "").trim();
            let contentType = Object.fromEntries(("type=" + partHeaders["Content-Type"]).replaceAll("\t", "").split(";").map((x) => x.split("=").map((y) => y.trim().replaceAll('"', ""))));
            let encoding = (!partHeaders["Content-Transfer-Encoding"] ? "8bit" : partHeaders["Content-Transfer-Encoding"]);
            
            let typeSplit = contentType.type.split("/");
            typeSplit[1] = typeSplit[1].replaceAll(";", "");

            if ((typeSplit[0] == "image" || typeSplit[0] == "text" || typeSplit[0] == "image" || typeSplit[0] == "application" || typeSplit[0] == "video") && Object.keys(contentType).includes("name")) {
                let content = decode(body, encoding, contentType.charset);
                email.attachments.push({
                    type: contentType.type,
                    name: contentType.name.replaceAll('"', ''),
                    id: partHeaders["Content-ID"],
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

    let email = { headers: {}, meta: {}, content: [], attachments: [] };

    email.headers = getHeaders(body);
    email.meta["to"] = email.headers["To"] ? parseListOfEmails(email.headers["To"]) : [];
    email.meta["cc"] = email.headers["Cc"] ? parseListOfEmails(email.headers["Cc"]) : [];
    email.meta["bcc"] = email.headers["Bcc"] ? parseListOfEmails(email.headers["Cc"]) : [];
    email.meta["from"] = { raw: email.headers["From"], parsed: email.headers["From"].match(emailRgx)[0] };
    email.meta["date"] = Date.parse(email.headers["Date"]);
    email.meta["subject"] = email.headers["Subject"];

    return parseSection([body], email);
}

module.exports = { parseEmail }