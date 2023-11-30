
// Handles fetch requests that require authentication
export const secureFetch = async (url, options) => {

  options = {
    credentials: "include",
    ...options,
  }

  const response = await fetch(url, options);

  if (response.status === 401) {
    window.open(`${import.meta.env.VITE_MACROSTRAT_INGEST_API}/security/login`, '_blank').focus();
    throw {name: "UnauthorizedError", message: "User is not logged in"}
  }

  return response
}