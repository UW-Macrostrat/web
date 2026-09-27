import { usePageContext } from "vike-react/usePageContext";

/** Whether the signed-in user is an admin, for showing admin controls. Hiding a
 * control is not authorization: the endpoint behind it checks for itself. */
export function useIsAdmin(): boolean {
  const ctx = usePageContext() as any;
  return ctx.user?.role == "web_admin";
}
