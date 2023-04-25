# nodejs Email Parser

A simple email parser for nodejs applications.

Takes raw emails and parses out text and attachments.

# Usage:

```
const emailParser = require('emailparser');

let email = ` [ raw email text ] `;

let parsedEmail = emailParser.parseEmail(email);
console.log(parsedEmail);

/*
{
    "attachments": [],
    "content": [
        { ... }
    },
    "headers": {
        "date": 0,
        "from": { "parsed": "test1@example.com", "raw": "Test1 <test1@example.com>" },
        "to": [{ "parsed": "test2@example.com", "raw": "test2@example.com" }],
        "subject": "email test"
    }
}
*/
```
