/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPEmailVerification from "../ResendOTPEmailVerification.js";
import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as albums from "../albums.js";
import type * as auth from "../auth.js";
import type * as barcodeScans from "../barcodeScans.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as factory from "../factory.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as lib_auth from "../lib/auth.js";
import type * as migrations from "../migrations.js";
import type * as music from "../music.js";
import type * as musicAlbums from "../musicAlbums.js";
import type * as musicFavorites from "../musicFavorites.js";
import type * as musicImport from "../musicImport.js";
import type * as musicPlaylists from "../musicPlaylists.js";
import type * as musicStorage from "../musicStorage.js";
import type * as musicTracks from "../musicTracks.js";
import type * as parking from "../parking.js";
import type * as productCache from "../productCache.js";
import type * as productReviewSubmissions from "../productReviewSubmissions.js";
import type * as products from "../products.js";
import type * as rightsReportActions from "../rightsReportActions.js";
import type * as rightsReports from "../rightsReports.js";
import type * as scanHistory from "../scanHistory.js";
import type * as shoppingImport from "../shoppingImport.js";
import type * as storeFavorites from "../storeFavorites.js";
import type * as stores from "../stores.js";
import type * as userMusicAlbums from "../userMusicAlbums.js";
import type * as userScanHistory from "../userScanHistory.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPEmailVerification: typeof ResendOTPEmailVerification;
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  albums: typeof albums;
  auth: typeof auth;
  barcodeScans: typeof barcodeScans;
  chat: typeof chat;
  crons: typeof crons;
  factory: typeof factory;
  files: typeof files;
  http: typeof http;
  items: typeof items;
  "lib/auth": typeof lib_auth;
  migrations: typeof migrations;
  music: typeof music;
  musicAlbums: typeof musicAlbums;
  musicFavorites: typeof musicFavorites;
  musicImport: typeof musicImport;
  musicPlaylists: typeof musicPlaylists;
  musicStorage: typeof musicStorage;
  musicTracks: typeof musicTracks;
  parking: typeof parking;
  productCache: typeof productCache;
  productReviewSubmissions: typeof productReviewSubmissions;
  products: typeof products;
  rightsReportActions: typeof rightsReportActions;
  rightsReports: typeof rightsReports;
  scanHistory: typeof scanHistory;
  shoppingImport: typeof shoppingImport;
  storeFavorites: typeof storeFavorites;
  stores: typeof stores;
  userMusicAlbums: typeof userMusicAlbums;
  userScanHistory: typeof userScanHistory;
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
