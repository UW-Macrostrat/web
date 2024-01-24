// Handles fetch requests that require authentication
export const secureFetch = async (url, options) => {
  options = {
    credentials: "include",
    ...options,
  };

  const response = await fetch(url, options);

  if (response.status === 401 || response.status === 403) {
    const url = new URL(
      `${import.meta.env.VITE_MACROSTRAT_INGEST_API}/security/login`
    );
    url.searchParams.append(
      "return_url",
      `${window.location.origin}/dev/security/endpoint`
    );

    window.open(url, "_blank").focus();
    throw { name: "UnauthorizedError", message: "User is not logged in" };
  }

  return response;
};
