import { requireDevInstance } from "~/_utils/auth-guards";

export async function guard() {
  requireDevInstance();
}
