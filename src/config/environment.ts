export interface Environment {
  port: number;
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  whatsapp: {
    businessPhoneId: string;
  };
}

export function loadEnvironment(): Environment {
  const requiredVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'WHATSAPP_BUSINESS_PHONE_ID',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    },
    whatsapp: {
      businessPhoneId: process.env.WHATSAPP_BUSINESS_PHONE_ID!,
    },
  };
}
