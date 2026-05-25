/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    adminActor?: {
      id: string;
      role: "ADMIN" | "SUPER_ADMIN";
    };
  }
}
