export const isLocalTesting = (): boolean => {
  return (
    typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_LOCAL_TESTING_AUTH === "true"
  );
};

export const mockUser = {
  id: 46,
  name: "Local Tester",
  email: "local@test",
  role: "web_admin",
  roles: ["web_admin"],
  groups: [{ id: 1, name: "web_admin" }],
  sub: "local-mock",
};
