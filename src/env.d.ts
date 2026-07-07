/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    adminActor?: {
      id: string;
      role: "ADMIN" | "SUPER_ADMIN";
    };
    customerActor?: {
      id: string;
      role: "CUSTOMER";
    };
  }
}

interface Env {
  JWT_SECRET: string;
  PAYMONGO_PAYMENT_METHODS?: string;
  PAYMONGO_SECRET_KEY?: string;
  PAYMONGO_SEND_EMAIL_RECEIPT?: string;
  PAYMONGO_WEBHOOK_SECRET?: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET?: string;
    PAYMONGO_PAYMENT_METHODS?: string;
    PAYMONGO_SECRET_KEY?: string;
    PAYMONGO_SEND_EMAIL_RECEIPT?: string;
    PAYMONGO_WEBHOOK_SECRET?: string;
  }
}
