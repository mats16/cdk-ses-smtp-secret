import * as path from 'path';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
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

    const generatePasswordFunction = new lambda.SingletonFunction(this, 'GenerateSmtpPasswordFunction', {
      uuid: '26da8434-d12f-4282-8afa-078111a0b00d',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', 'lambda-packages', 'generate_password_handler'), {
        bundling: {
          image: lambda.Runtime.NODEJS_14_X.bundlingImage,
          user: 'root',
          command: [
            'bash',
            '-c',
            'npm install -g typescript && pwd && ls -l && cp ./package.json /asset-output/package.json && npm install --prefix /asset-output /asset-output && tsc',
          ],
        },
      }),
      handler: 'index.handler',
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
      serviceToken: generatePasswordFunction.functionArn,
      properties: {
        SecretArn: this.secretFullArn!,
      },
    });
  };
}
