import { uuid } from "ransu";
import { token } from "ransu/secure";

export function newId(): string {
  return uuid.v7();
}

export function newSecretToken(): string {
  return token(32);
}
