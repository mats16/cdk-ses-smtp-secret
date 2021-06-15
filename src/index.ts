import * as path from 'path';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Secret, SecretProps } from '@aws-cdk/aws-secretsmanager';
import * as cdk from '@aws-cdk/core';
import { Construct } from 'constructs';

class IamUser extends iam.User {
  accessKey: string;
  secretAccessKey: string;

  constructor(scope: Construct, id: string, props: iam.UserProps = {}) {
    super(scope, id, props);

    this.attachInlinePolicy(new iam.Policy(this, 'AmazonSesSendingAccess', {
      policyName: 'AmazonSesSendingAccess',
      statements: [
        new iam.PolicyStatement({
          actions: ['ses:SendRawEmail'],
          resources: ['*'],
        }),
      ],
    }));
    const accessKey = new iam.CfnAccessKey(this, 'AccessKey', { userName: this.userName });

    this.accessKey = accessKey.ref;
    this.secretAccessKey = accessKey.attrSecretAccessKey;
  };
};

export class SmtpSecret extends Secret {

  constructor(scope: Construct, id: string, props: SecretProps = {}) {
    const iamUser = new IamUser(scope, 'SmtpUser');
    props = {
      ...props,
      generateSecretString: {
        generateStringKey: 'password',
        secretStringTemplate: JSON.stringify({
          access_key: iamUser.accessKey,
          secret_access_key: iamUser.secretAccessKey,
        }),
      },
    };
    super(scope, id, props);

    const generatePasswordHandler = new NodejsFunction(this, 'GeneratePasswordHandler', {
      entry: path.resolve(__dirname, '..', 'lambda-packages', 'generate_password_handler', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        SECRET_ARN: this.secretFullArn!,
      },
      initialPolicy: [
        new iam.PolicyStatement({
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:UpdateSecret',
          ],
          resources: [this.secretFullArn!],
        }),
      ],
    });

    new cdk.CustomResource(this, 'SmtpPassword', {
      serviceToken: generatePasswordHandler.functionArn,
      properties: {
        SecretArn: this.secretFullArn!,
      },
    });
  };
}
