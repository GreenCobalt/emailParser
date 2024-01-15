# nodejs Email Parser
## BREAKING CHANGES - see changes section

A simple MIME email parser for nodejs applications.

Takes raw emails and parses out text and attachments.

# Usage

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
    ],
    "headers": {
        "date": 0,
        "from": { "parsed": "test1@example.com", "raw": "Test1 <test1@example.com>" },
        "to": [{ "parsed": "test2@example.com", "raw": "test2@example.com" }],
        "subject": "email test"
    }
}
*/
```

# Changes
## 0.0.17 - BREAKING
parseEmail(body) returned Object:
- `headers` field changed to include all raw email headers, no parsing
- previous headers now appear in `meta` field - has specific parsed headers: to, from, etc