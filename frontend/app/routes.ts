import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";
export default [
  layout("routes/app-layout.tsx", [
    index("routes/home.tsx"),
    route("events/:eventId", "routes/event.tsx"),
    route("manage/new", "routes/create-event.tsx"),
    route("manage/accounts", "routes/accounts.tsx"),
    route("manage/events/:eventId", "routes/manage-event.tsx"),
  ]),
] satisfies RouteConfig;
