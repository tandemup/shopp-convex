import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "eliminar adjuntos de denuncias abandonadas",
  { hours: 1 },
  internal.rightsReports.cleanupExpiredDrafts,
);

export default crons;
