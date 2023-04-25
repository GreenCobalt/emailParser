const quotedPrintable = require('quoted-printable');
const utf8 = require('utf8');

let emailRgx = /[a-zA-Z0-9._%+-]*@[a-zA-Z0-9._%+-]*/;
let wantedHeaders = ["To", "From", "Date", "Subject"];

function decode(content, encoding = "8bit") {
    //7bit (ASCII) and 8bit map to UTF8 with no cnanges

    if (encoding.toLowerCase() == "quoted-printable" || content.includes("=20"))
        content = utf8.decode(quotedPrintable.decode(content));
    if (encoding.toLowerCase() == "base64") content =
        Buffer.from(content, 'base64').toString("utf8");

    content = content.trim();
    return content;
}

function parseEmail(body) {
    if (body == "") return false;
    wantedHeaders.forEach((header) => {
        if (body.split("\n" + header + ": ").length > 1) {
            return false;
        }
    });

    let email = { headers: {}, content: [], attachments: [] };
    body = body.replaceAll("\r\n", "\n");

    email.headers["to"] = body.split("\nTo: ")[1].split("\n")[0].split(", ").map((x) => { return { raw: x, parsed: x.match(emailRgx)[0] } });
    email.headers["from"] = { raw: body.split("\nFrom: ")[1].split("\n")[0], parsed: body.split("\nFrom: ")[1].split("\n")[0].match(emailRgx)[0] };
    email.headers["date"] = Date.parse(body.split("\nDate: ")[1].split("\n")[0]);
    email.headers["subject"] = body.split("\nSubject: ")[1].split("\n")[0];

    let ibd = body.split("Content-Type: ")[1].split("y=")[1].split("\n")[0].replaceAll('";', '').replaceAll('"', '').replaceAll("\n", "");
    let rmBody = body.split("--" + ibd)[1].split("--" + ibd + "--")[0];

    let cont = true;
    let nextBoundary = rmBody.split('"\n')[0].split('boundary="')[1];
    if (nextBoundary == undefined) nextBoundary = ibd;

    while (cont) {
        let tB = body.split("--" + nextBoundary);

        let next = tB.pop().split("--\n")[1];
        tB.shift();

        tB.forEach((part) => {
            if (!(part == "" || part == undefined)) {
                let cType = Object.fromEntries(("type=" + part.split("Content-Type: ")[1]).split("\n")[0].split("; ").map((x) => x.split("=")));
                cType.type = cType.type.replaceAll(";", "");

                let encoding = "8bit";
                if (part.split("Content-Transfer-Encoding: ").length > 1) encoding = part.split("Content-Transfer-Encoding: ")[1].split("\n")[0];

                let partClass = cType.type.split("/");
                if ((partClass[0] == "image" || partClass[0] == "text") && Object.keys(cType).includes("name")) {
                    email.attachments.push({
                        type: cType.type,
                        encoding: encoding,
                        name: cType.name.replaceAll('"', ''),
                        content: part.split("\n\n")[1].replaceAll("\n", "")
                    });
                } else if (partClass[0] == "text") {
                    let emContent = part.substring(part.indexOf('\n\n') + 1);
                    if (partClass[1] == "html") emContent = emContent.replaceAll("\n", "");
                    email.content.push({
                        type: cType.type,
                        encoding: encoding,
                        content: emContent.trim(),
                        decodedContent: decode(emContent, encoding)
                    });
                } else {
                    log.err("Unknown email MIME type", partClass, "encountered while parsing email from", email.headers.from.parsed);
                }
            }
        });

        if (next) {
            nextBoundary = next.split("\n")[0].slice(2);
            body = next;
        } else {
            cont = false;
        }
    }

    return email;
}

module.exports = { parseEmail }