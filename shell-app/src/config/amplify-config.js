import { Amplify } from 'aws-amplify';

const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: 'ap-south-1_pYDvvfi2U',
            userPoolClientId: '1bphc3km6f12iaaqffnq3n7j3a',
            region: 'ap-south-1'
        }
    }
};

Amplify.configure(amplifyConfig);

export default amplifyConfig;
