/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as auth from "../auth.js";
import type * as barcodeScans from "../barcodeScans.js";
import type * as chat from "../chat.js";
import type * as factory from "../factory.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as migrations from "../migrations.js";
import type * as parking from "../parking.js";
import type * as products from "../products.js";
import type * as scanHistory from "../scanHistory.js";
import type * as storeFavorites from "../storeFavorites.js";
import type * as stores from "../stores.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  auth: typeof auth;
  barcodeScans: typeof barcodeScans;
  chat: typeof chat;
  factory: typeof factory;
  http: typeof http;
  items: typeof items;
  migrations: typeof migrations;
  parking: typeof parking;
  products: typeof products;
  scanHistory: typeof scanHistory;
  storeFavorites: typeof storeFavorites;
  stores: typeof stores;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
