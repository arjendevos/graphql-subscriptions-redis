import { config, Depromisify } from "./utils";
import * as jwt from "jsonwebtoken";

export interface ResolverContext {
  is_authed: boolean;
  account_id?: string;
}

export const context = async ({ req }) => {
  const ctx: ResolverContext = {
    is_authed: false,
  };

  let token: string = req?.headers?.authorization || "";

  if (token) {
    if (token.startsWith("Bearer")) token = token.split(" ")[1];

    const decoded = jwt.verify(token, config.TOKEN_SECRET);

    if (typeof decoded === "string") return ctx;

    if (decoded.account_id) {
      ctx.is_authed = true;
      ctx.account_id = decoded.account_id;
    }
    return ctx;
  }
};

export type Context = Depromisify<typeof context>;
