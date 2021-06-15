import * as cdk from '@aws-cdk/core';
import { SmtpSecret } from './index';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

new SmtpSecret(stack, 'SmtpSecret');