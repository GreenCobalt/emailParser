const rewire = require("rewire");
const emailParser = rewire("./emailParser.js");

let decodeTest = emailParser.__get__("decode");

let emailText = `Content-Type: multipart/alternative; boundary=EMAIL BOUNDARY 324
From: Test1 <test1@example.com>
Subject: email test
Date: Thu, 1 Jan 1970 00:00:00 -0000
To: test2@example.com
Subject: email test


--EMAIL BOUNDARY 324
Content-Type: text/plain
Content-Transfer-Encoding: quoted-printable

te=20st

--EMAIL BOUNDARY 324
Content-Type: text/html
Content-Transfer-Encoding: quoted-printable

<body>te=20st</body>

--EMAIL BOUNDARY 324
Content-Type: text/plain
Content-Transfer-Encoding: base64

RG9jdW1lbnRhY2nDs24gZXMgPSBh

--EMAIL BOUNDARY 324--`;

let expectedEmail = {
    "attachments": [],
    "content": [
        {
            "content": `te=20st`,
            "decodedContent": `te st`,
            "encoding": "quoted-printable",
            "type": "text/plain"
        },
        {
            "content": `<body>te=20st</body>`,
            "decodedContent": `<body>te st</body>`,
            "encoding": "quoted-printable",
            "type": "text/html"
        },
        {
            "content": `RG9jdW1lbnRhY2nDs24gZXMgPSBh`,
            "decodedContent": `Documentación es = a`,
            "encoding": "base64",
            "type": "text/plain"
        }
    ],
    "headers": {
        "date": 0,
        "from": { "parsed": "test1@example.com", "raw": "Test1 <test1@example.com>" },
        "to": [{ "parsed": "test2@example.com", "raw": "test2@example.com" }],
        "subject": "email test"
    }
}

test("expect decoder to function correctly (no encoding)", () => {
    expect(decodeTest("Documentación es = a")).toBe("Documentación es = a");
});
test("expect decoder to function correctly (quoted-printable)", () => {
    expect(decodeTest("Documentaci=C3=B3n es = a", "quoted-printable")).toBe("Documentación es = a");
});
test("expect decoder to function correctly (base64)", () => {
    expect(decodeTest("RG9jdW1lbnRhY2nDs24gZXMgPSBh", "base64")).toBe("Documentación es = a");
});


test("expect email to be parsed correctly", () => {
    expect(emailParser.parseEmail(emailText)).toMatchObject(expectedEmail);
});