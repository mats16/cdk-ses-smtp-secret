# cdk-ses-smtp-secret

CDK construct for [Amazon SES SMTP credentials](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html) with Amazon Secrets Manager

## Secret

```ts
import { SmtpSecret } from 'cdk-ses-smtp-secret';

const smtpSecret = new SmtpSecret(this, 'SmtpSecret');
```

This secret has the following values. Please use `username` and `password` to send emails over SMTP.

```json
{
    "access_key": "XXXXXXXXXXXXXXXXXXXXXX",
    "secret_access_key": "XXXXXXXXXXXXXXXXXXXXXX",
    "username": "XXXXXXXXXXXXXXXXXXXXXX",
    "password": "XXXXXXXXXXXXXXXXXXXXXX"
}
```
